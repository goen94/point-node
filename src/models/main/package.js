const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Package extends Model {
    static associate() {}
  }
  Package.init(
    {
      code: {
        type: DataTypes.STRING,
      },
      name: {
        type: DataTypes.STRING,
      },
      description: {
        type: DataTypes.STRING,
      },
      maxUser: {
        type: DataTypes.INTEGER,
      },
      price: {
        type: DataTypes.DECIMAL,
      },
      pricePerUser: {
        type: DataTypes.DECIMAL,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'Package',
      tableName: 'packages',
      underscored: true,
    }
  );
  return Package;
};
