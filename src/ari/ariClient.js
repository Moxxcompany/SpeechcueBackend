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
            let channelAlive = true;

            channel.once('StasisEnd', () => {
                logger.info(`📴 Channel ${channel.name} left Stasis.`);
                channelAlive = false;
            });

            try {
                const phoneNumber = channel.caller_rdnis;
                console.log('📞 Incoming call for:', phoneNumber);

                if (!phoneNumber) {
                    console.log('❌ No phone number found, hanging up...');
                    if (channelAlive) await channel.hangup();
                    return;
                }
                const flow = await getIVRFlowByPhoneNumber(phoneNumber);
                if (!flow) {
                    console.log('❌ No IVR flow found, hanging up...');
                    if (channelAlive) await channel.hangup();
                    return;
                }

                console.log('📜 IVR Flow Found');
                await runIVRFlow(client, channel, flow, channelAlive);
            } catch (err) {
                console.error('🔥 Error in StasisStart:', err);
                if (channelAlive) await channel.hangup();
            }
        });


        client.start('ivrapp');
        console.log('✅ ARI client started and listening for calls...');
    } catch (err) {
        console.error('❌ Failed to connect to ARI:', err);
    }
}

const playSound = async (client, channel, media, channelAlive) => {
    if (!channelAlive) {
        logger.warn('⚠ Skipping playback, channel no longer alive');
        return;
    }

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
async function dialPhoneNumbers(client, callerChannel, numbers = [], timeout = 20) {
    const bridge = client.Bridge();
    await bridge.create({ type: 'mixing' });

    callerChannel.ring();

    try {
        await bridge.addChannel({ channel: callerChannel.id });
        console.log('✅ Caller added to bridge');
    } catch (err) {
        console.error('❌ Failed to add caller to bridge:', err.message);
        return { status: 'bridge_failed' };
    }

    for (let i = 0; i < numbers.length; i++) {
        const number = numbers[i];
        const endpoint = `PJSIP/${number}@PSTN-Twilio`;
        const callerId = callerChannel.caller.number || '+10000000000';

        console.log(`📞 Attempting to dial: ${number} (${i + 1}/${numbers.length})`);

        const outgoing = await client.channels.originate({
            endpoint,
            app: 'ivrapp',
            appArgs: number,
            callerId,
            timeout,
        });

        const result = await new Promise((resolve) => {
            let resolved = false;

            const safeResolve = (res) => {
                if (!resolved) {
                    resolved = true;
                    resolve(res);
                }
            };

            outgoing.once('StasisStart', async (event, outChan) => {
                console.log('✅ Outgoing call answered:', outChan.name);
                try {
                    await bridge.addChannel({ channel: outChan.id });
                } catch (err) {
                    console.error('❌ Failed to bridge call:', err.message);
                    return safeResolve({ status: 'bridge_failed' });
                }

                outChan.once('StasisEnd', () => {
                    console.log('📴 Outgoing call ended');
                    safeResolve({ status: 'completed' });
                });
            });

            outgoing.once('ChannelDestroyed', () => {
                console.log('📞 Outbound call not answered or got disconnected');
                safeResolve({ status: 'not_answered' });
            });

            setTimeout(() => {
                if (!resolved) {
                    console.warn('⏰ Timeout dialing number:', number);
                    safeResolve({ status: 'timeout' });
                }
            }, timeout * 1000);
        });

        if (result.status === 'completed') {
            return result;
        } else {
            console.log(`❌ Call failed (${result.status}), trying next if available...`);
        }
    }

    return { status: 'all_failed' };
}

// [custom-ivrapp-incoming-custom]
// exten => 1001,1,NoOp(Entering call forward test)
//  ;same => n,Dial(PJSIP/+16476546126@PSTN-Twilio,30)
//  same => n,NoOp(Forwarding done or failed. Entering ARI...)
//  same => n,Stasis(ivrapp)
//  same => n,Hangup()

async function runIVRFlow(client, channel, flow, channelAlive) {
    console.log('📜 Running IVR flow:');

    const nodesMap = Object.fromEntries(flow.nodes.map(n => [n.id, n]));
    const getNextNodeId = (fromId) => {
        const edge = flow.edges.find(e => e.source === fromId);
        return edge?.target || null;
    };

    let currentNodeId = flow.nodes.find(n => n.id === '1')?.id;

    await new Promise(resolve => setTimeout(resolve, 1000));

    while (currentNodeId && channelAlive) {
        const node = nodesMap[currentNodeId];
        if (!node) break;

        const { type, data, voice } = node;

        switch (type) {
            case 'start':
                currentNodeId = getNextNodeId(currentNodeId);
                break;

            case 'answer':
                if (!channelAlive) return;
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
                    if (!channelAlive) return;
                    await playSound(client, channel, `sound:${urlWithoutExt}`, channelAlive);
                }

                currentNodeId = getNextNodeId(currentNodeId);
                break;
            }

            case 'forward': {
                const { phones = [], timeout = 20 } = data;
                const formattedPhones = phones.map(phone =>
                    phone.startsWith('+') ? phone : `+${phone}`
                );
                logger.info(`📞 Forwarding to: ${formattedPhones.join(', ')}`);
            
                const result = await dialPhoneNumbers(client, channel, formattedPhones, timeout);
            
                if (result.status === 'completed') {
                    logger.info('✅ Call connected successfully, skipping sorry message');
                    // Don't play sorry, just continue to next node
                } else {
                    logger.info('❌ All calls failed, playing sorry message');
                    await playSound(client, channel, 'sound:sorry', channelAlive);
                }
            
                logger.info(`📞 Forward result: ${result.status}`);
                currentNodeId = getNextNodeId(currentNodeId);
                break;
            }
            
            case 'hangup':
                logger.info('📞 Hangup node reached. Terminating call.');
                if (channelAlive) await channel.hangup();
                currentNodeId = null;
                break;

            default:
                logger.warn(`⚠ Unknown node type: ${type}`);
                if (channelAlive) await channel.hangup();
                currentNodeId = null;
        }
    }

    logger.info('✅ IVR session completed.');
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
