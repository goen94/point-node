const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class DeliveryOrder extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.Customer, { as: 'customer', onDelete: 'RESTRICT' });

      this.belongsTo(models.Warehouse, { as: 'warehouse', onDelete: 'RESTRICT' });

      this.belongsTo(models.SalesOrder, { as: 'salesOrder', onDelete: 'RESTRICT' });
    }
  }
  DeliveryOrder.init(
    {
      customerId: {
        type: DataTypes.INTEGER,
      },
      warehouseId: {
        type: DataTypes.INTEGER,
      },
      salesOrderId: {
        type: DataTypes.INTEGER,
      },
      customerName: {
        type: DataTypes.STRING,
      },
      customerAddress: {
        type: DataTypes.STRING,
      },
      customerPhone: {
        type: DataTypes.STRING,
      },
      billingAddress: {
        type: DataTypes.STRING,
      },
      billingPhone: {
        type: DataTypes.STRING,
      },
      billingEmail: {
        type: DataTypes.STRING,
      },
      shippingAddress: {
        type: DataTypes.STRING,
      },
      shippingPhone: {
        type: DataTypes.STRING,
      },
      shippingEmail: {
        type: DataTypes.STRING,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'DeliveryOrder',
      tableName: 'delivery_orders',
      underscored: true,
      timestamps: false,
    }
  );
  return DeliveryOrder;
};
