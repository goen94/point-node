const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class SalesOrderItem extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.SalesOrder, { as: 'salesOrder', onDelete: 'CASCADE' });

      this.belongsTo(models.Item, { as: 'item', onDelete: 'RESTRICT' });

      this.belongsTo(models.Allocation, { as: 'allocation', onDelete: 'RESTRICT' });
    }
  }
  SalesOrderItem.init(
    {
      salesOrderId: {
        type: DataTypes.INTEGER,
      },
      salesQuotationItemId: {
        type: DataTypes.INTEGER,
      },
      salesContractItemId: {
        type: DataTypes.INTEGER,
      },
      salesContractGroupItemId: {
        type: DataTypes.INTEGER,
      },
      itemId: {
        type: DataTypes.INTEGER,
      },
      itemName: {
        type: DataTypes.STRING,
      },
      quantity: {
        type: DataTypes.DECIMAL,
      },
      unit: {
        type: DataTypes.STRING,
      },
      converter: {
        type: DataTypes.DECIMAL,
      },
      price: {
        type: DataTypes.DECIMAL,
      },
      discountPercent: {
        type: DataTypes.DECIMAL,
      },
      discountValue: {
        type: DataTypes.DECIMAL,
      },
      taxable: {
        type: DataTypes.BOOLEAN,
      },
      notes: {
        type: DataTypes.TEXT,
      },
      allocationId: {
        type: DataTypes.INTEGER,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'SalesOrderItem',
      tableName: 'sales_order_items',
      underscored: true,
      timestamps: false,
    }
  );
  return SalesOrderItem;
};
