const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.generateJwt = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

exports.verifyJwt = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
