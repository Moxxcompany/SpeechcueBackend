import Sequelize from 'sequelize';
import config from '../config/db.config.js';
import logger from '../config/logger.js';

import defineUser from './user.model.js';
import defineSubAccount from './subaccount.model.js';
import definePhoneNumber from './phonenumber.model.js';
import defineSipDomain from './sipdomain.model.js';
import defineSipCredential from './sipcredential.model.js';
import defineIVR from './ivr.model.js'; 
import defineExtension from './extension.model.js';
import defineRingGroup from './ringgroup.model.js';

const sequelize = new Sequelize(config.DB, config.USER, config.PASSWORD, {
    host: config.HOST,
    dialect: config.dialect,
    port: config.PORT,
    logging: msg => logger.info(msg),
});

// Initialize models 
const User = defineUser(sequelize, Sequelize.DataTypes);
const SubAccount = defineSubAccount(sequelize, Sequelize.DataTypes);
const PhoneNumber = definePhoneNumber(sequelize, Sequelize.DataTypes);
const SipDomain = defineSipDomain(sequelize, Sequelize.DataTypes);
const SipCredential = defineSipCredential(sequelize, Sequelize.DataTypes);
const IVR = defineIVR(sequelize, Sequelize.DataTypes);
const Extension = defineExtension(sequelize, Sequelize.DataTypes);
const RingGroup = defineRingGroup(sequelize, Sequelize.DataTypes);

// associations
User.hasOne(SubAccount, { foreignKey: 'userId' });
SubAccount.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(SipDomain, { foreignKey: 'userId' });
SipDomain.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(SipCredential, { foreignKey: 'userId' });
SipCredential.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(PhoneNumber, { foreignKey: 'userId' });
PhoneNumber.belongsTo(User, { foreignKey: 'userId' });

IVR.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(IVR, { foreignKey: 'userId' });

Extension.belongsTo(User, { foreignKey: 'userId' });

IVR.hasMany(PhoneNumber, { foreignKey: 'ivrId' });
PhoneNumber.belongsTo(IVR, { foreignKey: 'ivrId', as: 'ivr' });

// User ↔ RingGroup (One-to-Many)
User.hasMany(RingGroup, { foreignKey: 'userId', as: 'ringgroups' });
RingGroup.belongsTo(User, { foreignKey: 'userId', as: 'user' });


export default {
  Sequelize,
  sequelize,
  User,
  SubAccount,
  PhoneNumber,
  SipDomain,
  SipCredential,
  IVR,
  Extension,
  RingGroup
};