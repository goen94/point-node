const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class Customer extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.Branch, { onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'createdByUser', foreignKey: 'createdBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'updatedByUser', foreignKey: 'createdBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'archivedByUser', foreignKey: 'createdBy', onDelete: 'RESTRICT' });
    }
  }
  Customer.init(
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
      zipCode: {
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
      phoneCc: {
        type: DataTypes.STRING,
      },
      email: {
        type: DataTypes.STRING,
      },
      notes: {
        type: DataTypes.TEXT,
      },
      creditLimit: {
        type: DataTypes.DECIMAL,
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
      pricingGroupId: {
        type: DataTypes.INTEGER,
      },
      archivedAt: {
        type: DataTypes.DATE,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'Customer',
      tableName: 'customers',
      underscored: true,
    }
  );
  return Customer;
};
