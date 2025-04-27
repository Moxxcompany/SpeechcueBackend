import bcrypt from 'bcrypt';
import db from '../models/index.js';
import { generateJwt } from '../utils/jwt.js';
import { verifyTelegramSignature } from '../utils/verifyTelegram.js';

const User = db.users;

/**
 * Web login using email and password
 * - Finds the user by email
 * - Compares hashed passwords using bcrypt
 * - Returns a JWT token if valid
 */
export const webLogin = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });

  if (!user || !user.password || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate JWT token after successful login
  const token = generateJwt({ id: user.id });
  res.json({ token });
};

/**
 * Telegram Mini App Authentication
 * - Validates Telegram payload using hash
 * - Creates a new user if one doesn't exist
 * - Returns a JWT token
 */
export const telegramMiniAuth = async (req, res) => {
  const data = req.body;

  // Validate the authenticity of Telegram-signed payload
  if (!verifyTelegramSignature(data, process.env.BOT_TOKEN)) {
    return res.status(403).json({ error: 'Invalid Telegram signature' });
  }

  // Find or create user by telegramId
  let user = await User.findOne({ where: { telegramId: data.id } });

  if (!user) {
    user = await User.create({
      name: data.first_name,
      telegramId: data.id,
      role: 'mini-app',
    });
  }

  // Issue token
  const token = generateJwt({ id: user.id, telegramId: user.telegramId });
  res.json({ token });
};

/**
 * Telegram Bot Authentication
 * - Accepts telegramId from bot messages
 * - Auto-registers user if not found
 * - Returns a session JWT token
 */
export const telegramBotAuth = async (req, res) => {
  const { telegramId, name } = req.body;

  if (!telegramId) {
    return res.status(400).json({ error: 'Missing telegramId' });
  }

  // Find or auto-create user
  let user = await User.findOne({ where: { telegramId } });

  if (!user) {
    user = await User.create({
      name,
      telegramId,
      role: 'bot',
    });
  }

  // Return JWT token for session tracking
  const token = generateJwt({ id: user.id, telegramId });
  res.json({ token });
};
