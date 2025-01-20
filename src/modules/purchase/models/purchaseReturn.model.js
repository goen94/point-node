const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class PurchaseReturn extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.PurchaseInvoice, { as: 'purchaseInvoice', foreignKey: 'purchaseInvoiceId' });
      this.belongsTo(models.Warehouse, { as: 'warehouse', foreignKey: 'warehouseId' });
      this.belongsTo(models.Supplier, { as: 'supplier', foreignKey: 'supplierId' });

      this.hasOne(models.Form, {
        as: 'form',
        foreignKey: 'formableId',
        constraints: false,
        scope: { formable_type: 'PurchaseReturn' },
      });
      this.hasMany(models.PurchasePaymentOrderDetails, {
        as: 'paymentOrderDetails',
        foreignKey: 'referenceableId',
        constraints: false,
        scope: { referenceable_type: 'PurchaseReturn' },
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
  PurchaseReturn.init(
    {
      purchaseInvoiceId: {
        type: DataTypes.INTEGER,
      },
      warehouseId: {
        type: DataTypes.INTEGER,
      },
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
      modelName: 'PurchaseReturn',
      tableName: 'purchase_returns',
      underscored: true,
      timestamps: false,
    }
  );
  return PurchaseReturn;
};
