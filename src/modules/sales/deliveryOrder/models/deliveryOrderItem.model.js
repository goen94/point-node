const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class DeliveryOrderItem extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.DeliveryOrder, { onDelete: 'CASCADE' });

      this.belongsTo(models.SalesOrderItem, { as: 'salesOrderItem' });

      this.belongsTo(models.Item, { onDelete: 'RESTRICT' });

      this.belongsTo(models.Allocation, { as: 'allocation', onDelete: 'RESTRICT' });
    }
  }
  DeliveryOrderItem.init(
    {
      deliveryOrderId: {
        type: DataTypes.INTEGER,
      },
      salesOrderItemId: {
        type: DataTypes.INTEGER,
      },
      itemId: {
        type: DataTypes.INTEGER,
      },
      itemName: {
        type: DataTypes.STRING,
      },
      quantity_delivered: {
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
      unit: {
        type: DataTypes.STRING,
      },
      converter: {
        type: DataTypes.DECIMAL,
      },
      allocationId: {
        type: DataTypes.INTEGER,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'DeliveryOrderItem',
      tableName: 'delivery_order_items',
      underscored: true,
      timestamps: false,
    }
  );
  return DeliveryOrderItem;
};
