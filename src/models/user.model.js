export default (sequelize, DataTypes) => {
  const User = sequelize.define('user', {
    name: DataTypes.STRING,
    email: { type: DataTypes.STRING, unique: true },
    password: DataTypes.STRING,
    telegramId: { type: DataTypes.STRING, unique: true, allowNull: true },
    role: { type: DataTypes.STRING, defaultValue: 'user' }
  });

  return User;
};
