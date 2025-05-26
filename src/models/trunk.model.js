export default (sequelize, DataTypes) => {
    return sequelize.define('Trunk', {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      type: {
        type: DataTypes.ENUM('PJSIP', 'SIP'),
        defaultValue: 'PJSIP',
      },
      username: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      outboundPrefix: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      server: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
    }, {
      tableName: 'trunks',
      timestamps: true,
    });
  };
  