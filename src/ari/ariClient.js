import ari from 'ari-client';
import { getIVRFlowByPhoneNumber } from '../utils/ivrStore.js';
import path from 'path';
import logger from '../config/logger.js';
import { getExtensionState, dialRingAll, dialSequential } from '../services/ivrDial.service.js';

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

            try {
                const phoneNumber = channel.caller_rdnis || channel.caller?.number || null;
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
// async function dialPhoneNumbers(client, callerChannel, numbers = [], timeout = 20) {
//     const bridge = client.Bridge();
//     await bridge.create({ type: 'mixing' });

//     callerChannel.ring();

//     try {
//         await bridge.addChannel({ channel: callerChannel.id });
//         console.log('✅ Caller added to bridge');
//     } catch (err) {
//         console.error('❌ Failed to add caller to bridge:', err.message);
//         return { status: 'bridge_failed' };
//     }

//     for (let i = 0; i < numbers.length; i++) {
//         const number = numbers[i];
//         const endpoint = `PJSIP/${number}@PSTN-Twilio`;
//         const callerId = callerChannel.caller.number || '+10000000000';

//         console.log(`📞 Attempting to dial: ${number} (${i + 1}/${numbers.length})`);

//         const outgoing = await client.channels.originate({
//             endpoint,
//             app: 'ivrapp',
//             appArgs: number,
//             callerId,
//             timeout,
//         });

//         const result = await new Promise((resolve) => {
//             let resolved = false;

//             const safeResolve = (res) => {
//                 if (!resolved) {
//                     resolved = true;
//                     resolve(res);
//                 }
//             };

//             outgoing.once('StasisStart', async (event, outChan) => {
//                 console.log('✅ Outgoing call answered:', outChan.name);
//                 try {
//                     await bridge.addChannel({ channel: outChan.id });
//                 } catch (err) {
//                     console.error('❌ Failed to bridge call:', err.message);
//                     return safeResolve({ status: 'bridge_failed' });
//                 }

//                 let startTime = Date.now();

//                 outChan.once('StasisEnd', () => {
//                     const duration = Date.now() - startTime;
//                     console.log(`📴 Outgoing call ended after ${duration} ms`);

//                     if (duration >= 5000) {
//                         // Talked at least 5 seconds → success
//                         safeResolve({ status: 'completed' });
//                     } else {
//                         // Too short → consider failed
//                         safeResolve({ status: 'too_short' });
//                     }
//                 });


//             });

//             outgoing.once('ChannelDestroyed', () => {
//                 console.log('📞 Outbound call not answered or got disconnected');
//                 safeResolve({ status: 'not_answered' });
//             });

//             setTimeout(() => {
//                 if (!resolved) {
//                     console.warn('⏰ Timeout dialing number:', number);
//                     safeResolve({ status: 'timeout' });
//                 }
//             }, timeout * 1000);
//         });

//         if (result.status === 'completed') {
//             logger.info('✅ Call connected and lasted long enough — skipping next calls.');
//         } else {
//             logger.info(`❌ Forwarding failed or call too short (${result.status}), playing sorry message`);
//             await playSound(client, channel, 'sound:sorry', channelAlive);
//         }

//     }

//     return { status: 'all_failed' };
// }

// async function dialPhoneNumbers(client, callerChannel, numbers = [], timeout = 20) {
//     const bridge = client.Bridge();
//     await bridge.create({ type: 'mixing' });

//     callerChannel.ring();
//     await bridge.addChannel({ channel: callerChannel.id });

//     const outgoingChannels = [];

//     const attempts = numbers.map((number) => {
//         return new Promise((resolve) => {
//             const endpoint = `PJSIP/${number}@PSTN-Twilio`;
//             const callerId = callerChannel.caller.number || '+10000000000';

//             const outgoing = client.channels.originate({
//                 endpoint,
//                 app: 'ivrapp',
//                 appArgs: number,
//                 callerId,
//                 timeout
//             });

//             outgoing.then((outChan) => {
//                 outgoingChannels.push(outChan);

//                 let startTime = Date.now();

//                 outChan.once('StasisStart', async () => {
//                     logger.info(`✅ Outgoing call answered: ${outChan.name}`);
//                     try {
//                         await bridge.addChannel({ channel: outChan.id });
//                     } catch (err) {
//                         logger.error('❌ Failed to bridge:', err.message);
//                         return resolve({ status: 'bridge_failed' });
//                     }

//                     outChan.once('StasisEnd', () => {
//                         const duration = Date.now() - startTime;
//                         logger.info(`📴 Call duration: ${duration}ms`);

//                         if (duration >= 5000) {
//                             resolve({ status: 'completed', channel: outChan });
//                         } else {
//                             resolve({ status: 'too_short' });
//                         }
//                     });
//                 });

//                 outChan.once('ChannelDestroyed', () => {
//                     resolve({ status: 'not_answered' });
//                 });

//                 setTimeout(() => {
//                     resolve({ status: 'timeout' });
//                 }, timeout * 1000);
//             }).catch((err) => {
//                 logger.warn(`❌ Failed to originate ${number}: ${err.message}`)
//                 resolve({ status: 'originate_failed' });
//             });
//         });
//     });

//     const result = await Promise.race(attempts);

//     // Hangup all other channels if one connected
//     for (const chan of outgoingChannels) {
//         if (chan.id !== result?.channel?.id) {
//             try {
//                 await chan.hangup();
//             } catch {}
//         }
//     }

//     return result;
// }

// async function dialPhoneNumbers(client, callerChannel, numbers = [], timeout = 20, strategy = 'hunt', flowId = '') {
//     const bridge = client.Bridge();
//     await bridge.create({ type: 'mixing' });
//     callerChannel.ring();
//     await bridge.addChannel({ channel: callerChannel.id });

//     let orderedNumbers = [...numbers];
//     logger.info('strategy:', strategy);
//     switch (strategy) {
//         case 'random':
//             orderedNumbers = orderedNumbers.sort(() => Math.random() - 0.5);
//             return await dialSequential(client, bridge, callerChannel, orderedNumbers, timeout, flowId);

//         case 'memoryhunt': {
//             if (flowId) {
//                 const last = await redis.get(`ivr:last_dialed:${flowId}`);
//                 if (last && orderedNumbers.includes(last)) {
//                     const index = orderedNumbers.indexOf(last);
//                     orderedNumbers = [...orderedNumbers.slice(index + 1), ...orderedNumbers.slice(0, index + 1)];
//                 }
//             }
//             return await dialSequential(client, bridge, callerChannel, orderedNumbers, timeout, flowId);
//         }

//         case 'firstavailable':
//         case 'firstnotonphone': {
//             const filtered = [];
//             for (const num of orderedNumbers) {
//                 const state = await getExtensionState(num);
//                 if (
//                     (strategy === 'firstavailable' && (state === 'Idle' || state === 'Unavailable')) ||
//                     (strategy === 'firstnotonphone' && state === 'Idle')
//                 ) {
//                     filtered.push(num);
//                 }
//             }
//             return await dialSequential(client, bridge, callerChannel, filtered, timeout, flowId);
//         }

//         case 'ringall':
//             return await dialRingAll(client, bridge, callerChannel, orderedNumbers, timeout);

//         case 'hunt':
//         default:
//             return await dialSequential(client, bridge, callerChannel, orderedNumbers, timeout, flowId);
//     }
// }

async function dialPhoneNumbers(client, callerChannel, numbers = [], timeout = 20, strategy = 'hunt', flowId = '') {
    const ringGroupExtension = '600'; // Static ring group extension (configured in FreePBX)
    const endpoint = `Local/${ringGroupExtension}@from-internal`;
    const callerId = callerChannel.caller?.number || '+10000000000';
  
    try {
      // Originate call to ring group
      await callerChannel.continueInDialplan({
        context: 'from-internal',
        extension: '600',
        priority: 1
      });
      
    //   const outgoing = await client.channels.originate({
    //     endpoint,
    //     app: 'ivrapp',
    //     appArgs: ringGroupExtension,
    //     callerId,
    //     timeout
    //   });
  
      // Wait for caller hangup before continuing
      await new Promise((resolve) => {
        callerChannel.once('StasisEnd', () => {
          logger.info(`📴 Caller ${callerChannel.name} left Stasis after ring group`);
          resolve();
        });
      });
  
      return { status: 'completed' };
    } catch (err) {
      logger.error(`❌ Failed to originate to ring group ${ringGroupExtension}: ${err.message}`);
      return { status: 'failed' };
    }
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

        console.log("###node", node)
        const { type, data, voice, sub_type } = node;

        // 🚫 Skip nodes marked for failed forward only if the forward was successful
        if (sub_type === 'failed' && flow?.forwardSuccess) {
            logger.info(`⏩ Skipping node ${node.id} — only runs on forward failure`);
            currentNodeId = getNextNodeId(currentNodeId);
            continue;
        }

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

                const strategy = data?.strategy || 'ringall';
                console.log("strategy", strategy)
                const result = await dialPhoneNumbers(client, channel, formattedPhones, timeout, strategy);

                if (result.status === 'completed') {
                    flow.forwardSuccess = true;
                    logger.info('✅ Call connected successfully — waiting until caller hangs up');

                    // prevent IVR from going to next nodes like hangup
                    return await new Promise((resolve) => {
                        channel.once('StasisEnd', () => {
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
