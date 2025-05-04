export default (sequelize, DataTypes) => {
    const PhoneNumber = sequelize.define('phone_number', {
      phoneNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
      friendlyName: DataTypes.STRING,
      isoCountry: DataTypes.STRING,
      type: DataTypes.STRING, // local, mobile, tollFree
      capabilities: DataTypes.JSONB,
      voiceUrl: DataTypes.STRING,
      smsUrl: DataTypes.STRING,
      userId: DataTypes.INTEGER,
      subAccountSid: DataTypes.STRING,
      sid: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ivrId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'ivr', key: 'id' },
        onDelete: 'SET NULL',
      },
    });
  
    return PhoneNumber;
  };
  