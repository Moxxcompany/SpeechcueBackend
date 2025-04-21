module.exports = (sequelize, DataTypes) => {
    return sequelize.define('user', {
      name: {
        type: DataTypes.STRING,
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      telegramId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
      },
      role: {
        type: DataTypes.STRING,
        defaultValue: 'user', // web, bot, mini-app, admin
      },
    });
  };
  