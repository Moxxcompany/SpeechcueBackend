const Sequelize = require('sequelize');
const config = require('../config/db.config');
const logger = require('../config/logger');

const sequelize = new Sequelize(config.DB, config.USER, config.PASSWORD, {
  host: config.HOST,
  dialect: config.dialect,
  port: config.PORT,
  logging: msg => logger.info(msg),
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.users = require('./user.model')(sequelize, Sequelize);

module.exports = db;
