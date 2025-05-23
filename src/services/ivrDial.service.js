import Redis from 'ioredis';
import AsteriskManager from 'asterisk-manager';
import logger from '../config/logger.js';

const redis = new Redis();
const ami = new AsteriskManager(5038, 'nodejs_user', 'nodejs_user', 'e700b9f2663594c810716d13a5ce85cd860f66b3', true);

// ✅ Redis connected
redis.on('connect', () => {
  console.log('✅ Redis connection established');
});

// ⚠️ Redis ready (after initial setup)
redis.on('ready', () => {
  console.log('🟢 Redis is ready to use');
});

// 📞 AMI extension state
export async function getExtensionState(ext) {
  return new Promise((resolve) => {
    ami.action({
      Action: 'ExtensionState',
      Exten: ext,
      Context: 'from-internal'
    }, (err, res) => {
      const states = {
        0: 'Idle',
        1: 'In Use',
        2: 'Busy',
        4: 'Unavailable',
        8: 'Ringing',
        16: 'On Hold'
      };
      resolve(states[parseInt(res?.Status)] || 'UNKNOWN');
    });
  });
}

// 🔁 Sequential Strategy
// export async function dialSequential(client, bridge, callerChannel, numbers, timeout, flowId) {
//   for (const number of numbers) {
//     const endpoint = `PJSIP/${number}@PSTN-Twilio`;
//     const callerId = callerChannel.caller.number || '+10000000000';

//     try {
//       const outgoing = await client.channels.originate({ endpoint, app: 'ivrapp', appArgs: number, callerId, timeout });

//       const result = await new Promise((resolve) => {
//         let resolved = false;
//         const safeResolve = (res) => {
//           if (!resolved) {
//             resolved = true;
//             resolve(res);
//           }
//         };

//         const startTime = Date.now();

//         outgoing.once('StasisStart', async (event, outChan) => {
//           try {
//             await bridge.addChannel({ channel: outChan.id });
//           } catch (err) {
//             if (err?.message?.includes('Channel not found')) {
//               logger.info(`⚠️ Skipped adding channel ${outChan.id} — it was already destroyed.`);
//               return safeResolve({ status: 'channel_gone' });
//             } else {
//               logger.error(`❌ Unexpected error adding channel ${outChan.id} to bridge: ${err.message}`);
//               return safeResolve({ status: 'bridge_failed' });
//             }
//           }

//           outChan.once('StasisEnd', () => {
//             const duration = Date.now() - startTime;
//             safeResolve(duration >= 5000 ? { status: 'completed' } : { status: 'too_short' });
//           });
//         });

//         outgoing.once('ChannelDestroyed', () => safeResolve({ status: 'not_answered' }));
//         setTimeout(() => safeResolve({ status: 'timeout' }), timeout * 1000);
//       });

//       if (result.status === 'completed' && flowId) {
//         await redis.set(`ivr:last_dialed:${flowId}`, number);
//         return result;
//       }
//     } catch (err) {
//       console.warn(`❌ Failed to call ${number}: ${err.message}`);
//     }
//   }

//   return { status: 'all_failed' };
// }

export async function dialSequential(client, bridge, callerChannel, numbers, timeout, flowId) {
  for (const number of numbers) {
    const endpoint = `PJSIP/${number}@PSTN-Twilio`;
    const callerId = callerChannel.caller.number || '+10000000000';

    try {
      const outgoing = await client.channels.originate({
        endpoint,
        app: 'ivrapp',
        appArgs: number,
        callerId,
        timeout
      });

      const result = await new Promise((resolve) => {
        let resolved = false;
        const safeResolve = (res) => {
          if (!resolved) {
            resolved = true;
            resolve(res);
          }
        };

        const startTime = Date.now();

        outgoing.once('StasisStart', async (event, outChan) => {
          try {
            await bridge.addChannel({ channel: outChan.id });
          } catch (err) {
            return safeResolve({ status: 'bridge_failed' });
          }

          outChan.once('StasisEnd', () => {
            const duration = Date.now() - startTime;
            safeResolve(duration >= 5000 ? { status: 'completed' } : { status: 'too_short' });
          });
        });

        outgoing.once('ChannelDestroyed', () => safeResolve({ status: 'not_answered' }));
        setTimeout(() => safeResolve({ status: 'timeout' }), timeout * 1000);
      });

      if (result.status === 'completed') {
        if (flowId) await redis.set(`ivr:last_dialed:${flowId}`, number);
        return result;
      }

    } catch (err) {
      logger.error(`❌ Failed to call ${number}: ${err.message}`);
    }
  }

  return { status: 'all_failed' };
}

// 🔔 RingAll Strategy
export async function dialRingAll(client, bridge, callerChannel, numbers, timeout) {
  const outgoingChannels = [];
  const activeChannels = new Map();
  let completed = false;

  // Bridge the caller
  await bridge.addChannel({ channel: callerChannel.id });

  const promises = numbers.map(number => new Promise((resolve) => {
    const endpoint = `PJSIP/${number}@PSTN-Twilio`;
    const callerId = callerChannel.caller.number || '+10000000000';

    client.channels.originate({
      endpoint,
      app: 'ivrapp',
      appArgs: number,
      callerId,
      timeout
    })
    .then((outChan) => {
      outgoingChannels.push(outChan);
      activeChannels.set(outChan.id, outChan);
      const startTime = Date.now();

      outChan.once('StasisStart', async () => {
        if (completed) return;

        try {
          await bridge.addChannel({ channel: outChan.id });
          completed = true;
          resolve({ status: 'completed', channel: outChan });

          // hangup all other ringing channels
          for (const [id, chan] of activeChannels.entries()) {
            if (id !== outChan.id) {
              try { await chan.hangup(); } catch {}
            }
          }

          outChan.once('StasisEnd', () => {
            const duration = Date.now() - startTime;
            logger.info(`📴 Call with ${outChan.id} ended after ${duration}ms`);
          });
        } catch (err) {
          logger.error(`❌ Failed to bridge ${outChan.id}: ${err.message}`);
          resolve({ status: 'bridge_failed' });
        }
      });

      outChan.once('ChannelDestroyed', () => {
        if (!completed) resolve({ status: 'not_answered' });
      });

      setTimeout(() => {
        if (!completed) resolve({ status: 'timeout' });
      }, timeout * 1000);
    })
    .catch(err => {
      logger.warn(`❌ Originate failed for ${number}: ${err.message}`);
      if (!completed) resolve({ status: 'originate_failed' });
    });
  }));

  const result = await Promise.race(promises);

  // If no one answers successfully
  if (!result || result.status !== 'completed') {
    for (const chan of outgoingChannels) {
      try { await chan.hangup(); } catch {}
    }
  }

  return result || { status: 'all_failed' };
}

