const logger = require('../config/logger');

module.exports = (err, req, res, next) => {
  logger.error(err.message);
  res.status(500).json({ error: 'Internal Server Error', message: err.message, success: false });
};
