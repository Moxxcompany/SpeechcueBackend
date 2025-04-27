import db from '../models/index.js';
const { User } = db;

// Get all users
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll();
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

// Create new user
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already exists.' });
    }

    const user = await User.create({ name, email, password });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};
