import dotenv from 'dotenv';
dotenv.config();

export default {
  HOST: process.env.DB_HOST,
  USER: process.env.DB_USER,
  PASSWORD: process.env.DB_PASS,
  DB: process.env.DB_NAME,
  dialect: 'postgres',
  PORT: process.env.DB_PORT,
};
