import express from 'express';
import { getRecordingsByIVR } from '../controllers/callRecordings.controller.js';

const router = express.Router();

router.get('/ivr/:ivrId', getRecordingsByIVR);

export default router;
