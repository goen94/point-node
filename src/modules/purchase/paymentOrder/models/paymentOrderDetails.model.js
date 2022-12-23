const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class PurchasePaymentOrderDetails extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.PurchasePaymentOrder, { as: 'purchasePaymentOrder', foreignKey: 'purchasePaymentOrderId' });
      this.belongsTo(models.ChartOfAccount, { as: 'chartOfAccount' });
      this.belongsTo(models.Allocation, { as: 'allocation' });
      this.belongsTo(models.PurchaseInvoice, {
        as: 'purchaseInvoice',
        foreignKey: 'referenceableId',
        constraints: false,
      });
      this.belongsTo(models.PurchaseDownPayment, {
        as: 'purchaseDownPayment',
        foreignKey: 'referenceableId',
        constraints: false,
      });
      this.belongsTo(models.PurchaseReturn, {
        as: 'purchaseReturn',
        foreignKey: 'referenceableId',
        constraints: false,
      });
    }
  }
  PurchasePaymentOrderDetails.init(
    {
      purchasePaymentOrderId: {
        type: DataTypes.INTEGER,
      },
      chartOfAccountId: {
        type: DataTypes.INTEGER,
      },
      allocationId: {
        type: DataTypes.INTEGER,
      },
      available: {
        type: DataTypes.DECIMAL,
      },
      amount: {
        type: DataTypes.DECIMAL,
      },
      notes: {
        type: DataTypes.STRING,
      },
      referenceableId: {
        type: DataTypes.INTEGER,
      },
      referenceableType: {
        type: DataTypes.STRING,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'PurchasePaymentOrderDetails',
      tableName: 'purchase_payment_order_details',
      underscored: true,
      timestamps: false,
    }
  );
  return PurchasePaymentOrderDetails;
};
