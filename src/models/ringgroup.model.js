export default (sequelize, DataTypes) => {
    return sequelize.define('RingGroup', {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        strategy: {
            type: DataTypes.ENUM('ringall', 'hunt', 'memoryhunt', 'firstavailable', 'firstnotonphone', 'sequential'),
            defaultValue: 'ringall',
        },
        timeout: {
            type: DataTypes.INTEGER,
            defaultValue: 20,
        },
        phones: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
        },
    }, {
        tableName: 'ring_groups',
    })
}
