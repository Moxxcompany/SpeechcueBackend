import express from 'express';
import { getTTSProvidersAndLanguages } from '../controllers/ttsInfo.controller.js';

const router = express.Router();

router.get('/providersAndLanguages', getTTSProvidersAndLanguages);

export default router;
