const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class PurchaseInvoice extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.Supplier, { as: 'supplier', foreignKey: 'supplierId' });
      this.hasOne(models.Form, {
        as: 'form',
        foreignKey: 'formableId',
        constraints: false,
        scope: { formable_type: 'PurchaseInvoice' },
      });
      this.hasMany(models.PurchasePaymentOrderDetails, {
        as: 'paymentOrderDetails',
        foreignKey: 'referenceableId',
        constraints: false,
        scope: { referenceable_type: 'PurchaseInvoice' },
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
  PurchaseInvoice.init(
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
      invoiceNumber: {
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
      dueDate: {
        type: DataTypes.DATE,
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
      remaining: {
        type: DataTypes.DECIMAL,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'PurchaseInvoice',
      tableName: 'purchase_invoices',
      underscored: true,
      timestamps: false,
    }
  );
  return PurchaseInvoice;
};
