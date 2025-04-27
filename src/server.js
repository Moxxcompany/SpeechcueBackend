import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import logger from './config/logger.js';

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});
