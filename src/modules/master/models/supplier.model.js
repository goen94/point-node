const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class Supplier extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.User, { as: 'createdByUser', foreignKey: 'createdBy' });
    }
  }
  Supplier.init(
    {
      code: {
        type: DataTypes.STRING,
      },
      taxIdentificationNumber: {
        type: DataTypes.STRING,
      },
      name: {
        type: DataTypes.STRING,
      },
      address: {
        type: DataTypes.STRING,
      },
      city: {
        type: DataTypes.STRING,
      },
      state: {
        type: DataTypes.STRING,
      },
      country: {
        type: DataTypes.STRING,
      },
      zip_code: {
        type: DataTypes.STRING,
      },
      latitude: {
        type: DataTypes.DOUBLE,
      },
      longitude: {
        type: DataTypes.DOUBLE,
      },
      phone: {
        type: DataTypes.STRING,
      },
      phone_cc: {
        type: DataTypes.STRING,
      },
      email: {
        type: DataTypes.STRING,
      },
      notes: {
        type: DataTypes.TEXT,
      },
      branchId: {
        type: DataTypes.INTEGER,
      },
      createdBy: {
        type: DataTypes.INTEGER,
      },
      updatedBy: {
        type: DataTypes.INTEGER,
      },
      archivedBy: {
        type: DataTypes.INTEGER,
      },
      createdAt: {
        type: DataTypes.DATE,
      },
      updatedAt: {
        type: DataTypes.DATE,
      },
      archivedAt: {
        type: DataTypes.DATE,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'Supplier',
      tableName: 'suppliers',
      underscored: true,
    }
  );
  return Supplier;
};
