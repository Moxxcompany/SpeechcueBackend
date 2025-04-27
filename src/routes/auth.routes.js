import express from 'express';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/web-login', authController.webLogin);
router.post('/telegram-mini', authController.telegramMiniAuth);
router.post('/telegram-bot', authController.telegramBotAuth);

export default router;
