module.exports = (sequelize, DataTypes) => {
    const SubAccount = sequelize.define('sub_account', {
        sid: { type: DataTypes.STRING, allowNull: false, unique: true },
        friendlyName: { type: DataTypes.STRING },
        authToken: { type: DataTypes.STRING },
        status: { type: DataTypes.STRING },
        dateCreated: { type: DataTypes.DATE },
        userId: { type: DataTypes.INTEGER } // foreign key reference
    });

    return SubAccount;
};
