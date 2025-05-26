import ari from 'ari-client';
import util from 'util';

export const startARIClient = async () => {
    try {
        // Enable debug logging
        const client = await ari.connect(
            'http://voice.speechcue.com:8088',
            'test',
            'Mercy@Admi12',
            { debug: true }  // ← Critical for troubleshooting
        );

        console.log('✅ ARI Connected');

        client.on('StasisStart', async (event, channel) => {
            console.log('🚀 RAW EVENT:', util.inspect(event, { depth: null }));
            
            try {
                await channel.answer();
                console.log('📞 Answered call from:', event.channel.dialplan.exten);
                
                // Immediate playback test (no DB dependencies)
                await channel.play({ media: 'sound:hello-world' });
                await channel.hangup();
            } catch (err) {
                console.error('❌ Channel error:', err);
            }
        });

        client.start('ivrapp');
        console.log('👂 Listening for Stasis events...');

    } catch (err) {
        console.error('🔥 ARI Connection Failed:', err.message);
        if (err.stack) console.error(err.stack);
    }
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
