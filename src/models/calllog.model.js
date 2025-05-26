export default (sequelize, DataTypes) => {
    const CallLog = sequelize.define('CallLog', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      ivrId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'ivr', key: 'id' },
        onDelete: 'CASCADE',
      },
      caller: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      callee: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      recordingPath: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      duration: {
        type: DataTypes.INTEGER, // in seconds
        allowNull: true,
      },
      transcript: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    }, {
      tableName: 'call_logs',
      timestamps: true,
    });
  
    return CallLog;
  };
  