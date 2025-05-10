import ari from 'ari-client';
import { getIVRFlowByPhoneNumber } from '../utils/ivrStore.js';
import path from 'path';
import logger from '../config/logger.js';

export async function startARIClient() {
    try {
        const client = await ari.connect(
            'http://voice.speechcue.com:8088',
            'test',
            'test_mercy'
        );

        client.on('StasisStart', async (event, channel) => {
            try {
                const phoneNumber = channel.caller_rdnis; // Caller ID
                // console.log('Channel:', channel);
                console.log(`📞 Incoming call to number : ${phoneNumber}`);

                const flow = await getIVRFlowByPhoneNumber(phoneNumber);
                if (!flow) {
                    console.log('❌ No IVR flow found, hanging up...');
                    await channel.hangup();
                    return;
                }
                console.log('📜 IVR Flow Found');
                await runIVRFlow(client, channel, flow);
            } catch (err) {
                console.error('🔥 Error in StasisStart:', err);
                await channel.hangup();
            }
        });

        client.start('ivrapp');
        console.log('✅ ARI client started and listening for calls...');
    } catch (err) {
        console.error('❌ Failed to connect to ARI:', err);
    }
}

const playSound = async (client, channel, media) => {
    return new Promise((resolve, reject) => {
        const playback = client.Playback();

        console.log(`🎵 Starting playback for: ${media}`);
        logger.info(`🎵 Playback started: ${media} [Playback ID: ${playback.id}]`);

        // Listen for playback finish
        client.on('PlaybackFinished', () => {
            logger.info(`✅ Playback finished: ${media} [Playback ID: ${playback.id}]`);
            resolve();
        });

        // Listen for playback failure
        client.on('PlaybackFailed', () => {
            logger.error(`❌ Playback failed: ${media} [Playback ID: ${playback.id}]`);
            reject(new Error(`Playback failed for ${media}`));
        });

        // Start playback
        channel.play({ media, playback }, (err) => {
            if (err) {
                logger.error(`❌ Error starting playback: ${media}`, err);
                reject(err);
            }
        });
    });
};

async function dialPhoneNumbers(client, callerChannel, numbers, timeout = 20) {
    const bridge = client.Bridge();
    await bridge.create({ type: 'mixing' });
    await bridge.addChannel({ channel: callerChannel.id });
  
    const number = numbers[0];
    const endpoint = `Local/${number}@from-internal`;
  
    const outgoing = await client.channels.originate({
      endpoint,
      app: 'ivrapp',
      appArgs: 'outbound',
      callerId: callerChannel.caller.number,
      timeout
    });
  
    outgoing.once('StasisStart', async () => {
      console.log('✅ Outgoing channel answered');
      await bridge.addChannel({ channel: outgoing.id });
    });
  
    return { status: 'forwarded' };
  }
  

async function runIVRFlow(client, channel, flow) {
    console.log('📜 Running IVR flow:');
    const nodesMap = Object.fromEntries(flow.nodes.map(n => [n.id, n]));
    const getNextNodeId = (fromId) => {
        const edge = flow.edges.find(e => e.source === fromId);
        return edge?.target || null;
    };

    let currentNodeId = flow.nodes.find(n => n.id === '1')?.id;
    // if (!currentNodeId) {
    //     console.log('⚠ No start node found.');
    //     await channel.hangup();
    //     return;
    // }

    await new Promise(resolve => setTimeout(resolve, 1000));

    while (currentNodeId) {
        const node = nodesMap[currentNodeId];
        if (!node) break;

        const { type, data, voice } = node;

        switch (type) {
            case 'start':
                currentNodeId = getNextNodeId(currentNodeId);
                break;

            case 'answer':
                logger.info('✅ Answering call');
                await channel.answer();
                currentNodeId = getNextNodeId(currentNodeId);
                break;

            case 'tts': {
                const gcsUrl = data?.audioUrl;
                const urlWithoutExt = gcsUrl?.replace(path.extname(gcsUrl), '');

                if (!urlWithoutExt) {
                    logger.warn(`⚠ Missing audio URL for node ${node.id}`);
                    currentNodeId = getNextNodeId(currentNodeId);
                    break;
                }

                const repeat = voice?.play || 1;
                logger.info(`🔊 Playing TTS: ${urlWithoutExt}, Repeat: ${repeat}`);

                for (let i = 0; i < repeat; i++) {
                    await playSound(client, channel, `sound:${urlWithoutExt}`);
                }

                currentNodeId = getNextNodeId(currentNodeId);
                break;
            }

            case 'input': {
                const retries = data.retries || 10;
                let userInput = null;
                let attempts = 0;

                while (attempts < retries && userInput === null) {
                    try {
                        userInput = await waitForDTMF(channel, data.timeout || 5);
                        logger.info(`🔢 DTMF received: ${userInput}`);
                    } catch {
                        attempts++;
                        logger.warn(`⚠ No input (Attempt ${attempts}/${retries})`);
                    }
                }

                let matchedChoice = null;

                if (userInput) {
                    for (const choice of data.choices || []) {
                        if (choice.dtmf === userInput) {
                            matchedChoice = choice;
                            break;
                        }
                    }
                }

                if (!userInput && data.choices) {
                    matchedChoice = data.choices.find(c => c.condition === 'no_input');
                }

                if (!matchedChoice && userInput) {
                    matchedChoice = data.choices.find(c => c.condition === 'unknown');
                }

                if (matchedChoice?.next) {
                    currentNodeId = matchedChoice.next;
                    console.log(`Matched choice: ${matchedChoice.dtmf}, Next node: ${currentNodeId}`);
                } else {
                    logger.info('📞 No valid input or fallback found, hanging up...');
                    await channel.hangup();
                    return;
                }

                break;
            }

            case 'forward': {
                const { phones = [], timeout = 20, strategy = 'sequential' } = data;

                logger.info(`📞 Forwarding to: ${phones.join(', ')}, strategy: ${strategy}`);

                // Assume dialPhoneNumbers is a utility to handle bridge + dialing
                const result = await dialPhoneNumbers(client, channel, phones, timeout, strategy);

                logger.info(`📞 Forward result: ${result.status}`);
                currentNodeId = getNextNodeId(currentNodeId);
                break;
            }

            case 'hangup':
                logger.info('📞 Hangup node reached. Terminating call.');
                // await channel.hangup();
                currentNodeId = null;
                break;

            default:
                logger.warn(`⚠ Unknown node type: ${type}`);
                await channel.hangup();
                currentNodeId = null;
        }
    }


    logger.info('✅ IVR session completed.');

    console.log('✅ IVR session completed.');
}

function waitForDTMF(channel, timeoutSeconds) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            channel.removeAllListeners('ChannelDtmfReceived');
            reject(new Error('DTMF Timeout'));
        }, timeoutSeconds * 1000);

        channel.once('ChannelDtmfReceived', (event) => {
            clearTimeout(timeout);
            resolve(event.digit);
        });
    });
}
