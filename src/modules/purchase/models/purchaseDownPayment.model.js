const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class PurchaseDownPayment extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.Supplier, { as: 'supplier', foreignKey: 'supplierId' });
      this.hasOne(models.Form, {
        as: 'form',
        foreignKey: 'formableId',
        constraints: false,
        scope: { formable_type: 'PurchaseDownPayment' },
      });
      this.hasMany(models.PurchasePaymentOrderDetails, {
        as: 'paymentOrderDetails',
        foreignKey: 'referenceableId',
        constraints: false,
        scope: { referenceable_type: 'PurchaseDownPayment' },
      });
    }

    async getAvailable() {
      const paymentOrderDetails = await this.getPaymentOrderDetails();
      let available = this.amount
      for (const paymentOrderDetail of paymentOrderDetails) {
        const paymentOrder = await paymentOrderDetail.getPurchasePaymentOrder();
        const form = await paymentOrder.getForm();
        if (form.cancellationStatus != 1) {
          available = parseFloat(available) - parseFloat(paymentOrderDetail.amount);
        }
      }
      return available;
    }
  }
  PurchaseDownPayment.init(
    {
      supplierId: {
        type: DataTypes.INTEGER,
      },
      supplierName: {
        type: DataTypes.STRING,
      },
      supplierAddress: {
        type: DataTypes.STRING,
      },
      supplierPhone: {
        type: DataTypes.STRING,
      },
      downpaymentableId: {
        type: DataTypes.INTEGER,
      },
      downpaymentableType: {
        type: DataTypes.STRING,
      },
      amount: {
        type: DataTypes.DECIMAL,
      },
      remaining: {
        type: DataTypes.DECIMAL,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'PurchaseDownPayment',
      tableName: 'purchase_down_payments',
      underscored: true,
      timestamps: false,
    }
  );
  return PurchaseDownPayment;
};
