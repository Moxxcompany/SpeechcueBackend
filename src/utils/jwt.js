import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const generateJwt = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

export const verifyJwt = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
