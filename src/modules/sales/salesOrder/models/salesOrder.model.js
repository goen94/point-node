const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class SalesOrder extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.Customer, { as: 'customer' });

      this.belongsTo(models.Warehouse, { as: 'warehouse' });

      this.hasMany(models.SalesOrderItem, { as: 'items' });

      this.hasOne(models.Form, {
        as: 'form',
        foreignKey: 'formableId',
        constraints: false,
        scope: { formable_type: 'SalesOrder' },
      });
    }
  }
  SalesOrder.init(
    {
      salesQuotationId: {
        type: DataTypes.INTEGER,
      },
      salesContractId: {
        type: DataTypes.INTEGER,
      },
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      customerName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      customerAddress: {
        type: DataTypes.STRING,
      },
      customerPhone: {
        type: DataTypes.STRING,
      },
      billingAddress: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      billingPhone: {
        type: DataTypes.STRING,
      },
      billingEmail: {
        type: DataTypes.STRING,
      },
      shippingAddress: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      shippingPhone: {
        type: DataTypes.STRING,
      },
      shippingEmail: {
        type: DataTypes.STRING,
      },
      warehouseId: {
        type: DataTypes.INTEGER,
      },
      eta: {
        type: DataTypes.DATE,
      },
      cashOnly: {
        type: DataTypes.BOOLEAN,
      },
      needDownPayment: {
        type: DataTypes.DECIMAL,
      },
      deliveryFee: {
        type: DataTypes.DECIMAL,
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
    },
    {
      hooks: {},
      sequelize,
      modelName: 'SalesOrder',
      tableName: 'sales_orders',
      underscored: true,
    }
  );
  return SalesOrder;
};
