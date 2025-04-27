
export default (sequelize, DataTypes) => {
    const IVR = sequelize.define('IVR', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE',
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
        },
        flow: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
    }, {
        tableName: 'ivrs',
        timestamps: true,
    });
    return IVR;
}
