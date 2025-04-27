import { Router } from 'express';
import { testIVRFlow } from '../controllers/test.controller.js';

const router = Router();

router.post('/test-ivr/:ivrId', testIVRFlow);

export default router;
