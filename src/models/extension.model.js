export default (sequelize, DataTypes) => {
    const Extension = sequelize.define('extension', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        extensionId: {
            type: DataTypes.INTEGER,
            unique: true,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        displayname: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        tech: {
            type: DataTypes.STRING,
            defaultValue: 'pjsip',
        }
    }, {
        timestamps: true,
    })
    return Extension;
}

