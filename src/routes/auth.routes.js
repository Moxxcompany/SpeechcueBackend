const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/web-login', authController.webLogin);
router.post('/telegram-mini', authController.telegramMiniAuth);
router.post('/telegram-bot', authController.telegramBotAuth);

module.exports = router;
