module.exports = (sequelize, DataTypes) => {
    return sequelize.define('sip_credentials', {
      credentialListSid: {
        type: DataTypes.STRING,
        allowNull: false
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      subAccountSid: {
        type: DataTypes.STRING,
        allowNull: false
      },
      userId: DataTypes.INTEGER
    });
  };
  