const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class PosBill extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.Customer, { onDelete: 'RESTRICT' });

      this.belongsTo(models.Warehouse, { onDelete: 'RESTRICT' });
    }
  }
  PosBill.init(
    {
      customerId: {
        type: DataTypes.INTEGER,
      },
      warehouseId: {
        type: DataTypes.INTEGER,
      },
      customerName: {
        type: DataTypes.STRING,
      },
      warehouseName: {
        type: DataTypes.STRING,
      },
      discountPercent: {
        type: DataTypes.DECIMAL,
      },
      discountValue: {
        type: DataTypes.DECIMAL,
      },
      typeOfTax: {
        type: DataTypes.STRING,
      },
      tax: {
        type: DataTypes.DECIMAL,
      },
      amount: {
        type: DataTypes.DECIMAL,
      },
      paid: {
        type: DataTypes.DECIMAL,
      },
      notes: {
        type: DataTypes.TEXT,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'PosBill',
      tableName: 'pos_bills',
      underscored: true,
    }
  );
  return PosBill;
};
