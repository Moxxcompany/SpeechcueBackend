import logger from '../config/logger.js';

export default (err, req, res, next) => {
  logger.error(err.message);
  res.status(500).json({ error: 'Internal Server Error', message: err.message, success: false });
};
