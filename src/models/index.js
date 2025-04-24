const Sequelize = require('sequelize');
const config = require('../config/db.config');
const logger = require('../config/logger');

const sequelize = new Sequelize(config.DB, config.USER, config.PASSWORD, {
    host: config.HOST,
    dialect: config.dialect,
    port: config.PORT,
    logging: msg => logger.info(msg),
});

// Initialize models 
const User = require('./user.model')(sequelize, Sequelize.DataTypes);
const SubAccount = require('./subaccount.model')(sequelize, Sequelize.DataTypes);
const PhoneNumber = require('./phonenumber.model')(sequelize, Sequelize.DataTypes);
const SipDomain = require('./sipdomain.model')(sequelize, Sequelize.DataTypes);
const SipCredential = require('./sipcredential.model')(sequelize, Sequelize.DataTypes);

// associations
User.hasOne(SubAccount, { foreignKey: 'userId' });
SubAccount.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(SipDomain, { foreignKey: 'userId' });
SipDomain.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(SipCredential, { foreignKey: 'userId' });
SipCredential.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(PhoneNumber, { foreignKey: 'userId' });
PhoneNumber.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  Sequelize,
  sequelize,
  User,
  SubAccount,
  PhoneNumber,
  SipDomain,
  SipCredential
};
