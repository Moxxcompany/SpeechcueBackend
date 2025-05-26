import ari from 'ari-client';
import { getIVRFlowByPhoneNumber } from '../utils/ivrStore.js';
import path from 'path';
import logger from '../config/logger.js';
// import { getExtensionState, dialRingAll, dialSequential } from '../services/ivrDial.service.js';
import * as RingGroupService from '../services/ringgroup.service.js';
import * as CallRecordingService from '../services/callrecording.service.js';


let callStartTime = Date.now();

export async function startARIClient() {
    try {
        const client = await ari.connect(
            'http://voice.speechcue.com:8088',
            'test',
            'test_mercy'
        );

        client.on('StasisStart', async (event, channel) => {
            let channelAlive = true;
            const isOutboundLeg = channel.appData;
            const isLocalContext = channel.name.startsWith('Local/');

            // 🚫 Ignore outbound channels and Local dialplan calls (ring groups)
            if (isOutboundLeg || isLocalContext) {
                logger.info(`➡️ Skipping IVR logic for channel ${channel.name}`);
                return;
            }

            channel.once('StasisEnd', () => {
                logger.info(`📴 Channel ${channel.name} left Stasis.`);
                channelAlive = false;
            });

            channel.on('RecordingFinished', () => {
                logger.info(`📴 Channel ${channel.name} left Statsis.`);
                channelAlive = false;
            });

            try {
                const phoneNumber = channel.caller_rdnis || channel.caller?.number || null;
                console.log('📞 Incoming call for:', phoneNumber);

                if (!phoneNumber) {
                    console.log('❌ No phone number found, hanging up...');
                    if (channelAlive) await channel.hangup();
                    return;
                }
                const { flow, ivrDetails } = await getIVRFlowByPhoneNumber(phoneNumber);
                if (!flow) {
                    console.log('❌ No IVR flow found, hanging up...');
                    if (channelAlive) await channel.hangup();
                    return;
                }

                logger.info('📜 IVR Flow Found:', ivrDetails.name);
                await runIVRFlow({ client, channel, flow, channelAlive, ivrDetails });
                
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

async function dialPhoneNumbers({ client, channel, ringGroupId = '600', flow, ivrDetails, isRecordingEnabled }) {

    try {

        // Start recording before forwarding the call
        const bridge = client.Bridge();
        await bridge.create({ type: 'mixing' });

        // Add caller to bridge
        await bridge.addChannel({ channel: channel?.id });
        const callerNumber = channel.caller?.number || 'unknown';
        const flowName = flow?.name?.replace(/\s+/g, '_') || 'ivr';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        const recordingName = `${flowName}_${timestamp}`;
        if (isRecordingEnabled) {
            callStartTime = Date.now();
            await bridge.record({
                name: recordingName,
                format: 'wav',
                beep: false,
                ifExists: 'overwrite'
            });
            logger.info(`🎙️ Recording started: ${recordingName}`);
        }

        const recordingPath = `/var/spool/asterisk/recording/${ivrDetails?.id}/${recordingName}.wav`;
        await CallRecordingService.create({
            ivrId: ivrDetails?.id || null,
            caller: channel?.caller?.number || null,
            callee: ringGroupId,
            recordingPath: recordingPath,
            status: 'completed',
            timestamp: new Date()
        });

        logger.info(`💾 Call log saved with recording: ${recordingPath}`);

        // Originate call to dynamic ring group
        await channel.continueInDialplan({
            context: 'from-internal',
            extension: ringGroupId,
            priority: 1
        });

        // Wait for caller hangup before continuing
        await new Promise((resolve) => {
            channel.once('StasisEnd', () => {
                logger.info(`📴 Caller ${channel.name} left Stasis after ring group`);
                resolve();
            });
        });

        return { status: 'completed' };
    } catch (err) {
        logger.error(`❌ Failed to originate to ring group ${ringGroupId}: ${err.message}`);
        return { status: 'failed' };
    }
}

async function runIVRFlow({ client, channel, flow, channelAlive, ivrDetails }) {
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

        console.log("###node", node)
        const { type, data, voice, sub_type } = node;

        // 🚫 Skip nodes marked for failed forward only if the forward was successful
        if (sub_type === 'failed' && flow?.forwardSuccess) {
            logger.info(`⏩ Skipping node ${node.id} — only runs on forward failure`);
            currentNodeId = getNextNodeId(currentNodeId);
            continue;
        }

        const isRecordingEnabled = flow?.recordingEnabled || true;

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
                const { ringGroupId } = data;

                console.log("ringGroupId", ringGroupId)
                let ringGroupNumber, numbers, strategy;
                if (ringGroupId) {
                    const ringGroup = await RingGroupService.findByIdWithoutAuth(ringGroupId);
                    if (ringGroup) {
                        ringGroupNumber = ringGroup.ringGroupId;
                        numbers = ringGroup.phones;
                        strategy = ringGroup.strategy || "ringall";
                        logger.info(`📞 Fetched ring group ${ringGroupId}: [${numbers.join(', ')}]`);
                    } else {
                        logger.warn(`⚠ Ring group ${ringGroupId} not found, falling back to inline phones`);
                    }
                }
                console.log("ringGroupNumber", ringGroupNumber);
                const result = await dialPhoneNumbers({ client, channel, ringGroupId: ringGroupNumber, flow, ivrDetails, isRecordingEnabled });

                    if (result.status === 'completed') {
                        flow.forwardSuccess = true;

                        logger.info('✅ Call connected successfully — waiting until caller hangs up');

                        // prevent IVR from going to next nodes like hangup
                        return await new Promise((resolve) => {
                            channel.on('StasisEnd', async () => {
                                logger.info(`📴 Caller ${channel.name} hung up. Ending IVR.`);
                                resolve();
                            });
                        });
                    } else {
                        flow.forwardSuccess = false;
                        logger.info('❌ All calls failed, playing sorry message if defined');
                        logger.info(`📞 Forward result: ${result.status}`);
                        currentNodeId = getNextNodeId(currentNodeId);
                    }

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
