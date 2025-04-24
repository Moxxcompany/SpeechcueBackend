module.exports = (sequelize, DataTypes) => {
    return sequelize.define('sip_domains', {
      domainSid: {
        type: DataTypes.STRING,
        allowNull: false
      },
      domainName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      voiceUrl: {
        type: DataTypes.STRING
      },
      subAccountSid: {
        type: DataTypes.STRING,
        allowNull: false
      },
      userId: DataTypes.INTEGER
    });
  };
  