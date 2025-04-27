import { runIVRFlow } from '../ari/runIVRFlow.js';
import { getIVRById } from '../services/ivr.service.js';
import logger from '../config/logger.js';

export const testIVRFlow = async (req, res, next) => {
  try {
    const { ivrId } = req.params;

    const ivr = await getIVRById(ivrId, req.body.userId);
    if (!ivr) return res.status(404).json({ message: 'IVR not found' });

    // simulate channel
    const fakeChannel = {
      id: 'testChannel',
      play: async ({ media }, playback) => {
        logger.info(`Playing: ${media}`);
      },
      on: (event, callback) => {
        logger.info(`Listening for: ${event}`);
        setTimeout(() => {
          logger.info(`Simulating DTMF: 1`);
          callback({ digit: '1' });
        }, 2000);
      },
      removeListener: () => {},
      answer: async () => logger.info(`Channel answered`),
      hangup: async () => logger.info(`Call ended`)
    };

    await runIVRFlow(fakeChannel, ivr.flow);

    res.json({ message: 'IVR executed (simulated)' });
  } catch (err) {
    logger.error(`Test IVR failed: ${err.message}`);
    next(err);
  }
};
