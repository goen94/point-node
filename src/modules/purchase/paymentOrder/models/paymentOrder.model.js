const { Op } = require('sequelize');
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class PurchasePaymentOrder extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.Supplier, { as: 'supplier', foreignKey: 'supplierId' });
      this.hasMany(models.PurchasePaymentOrderDetails, { as: 'invoices', scope: { referenceable_type: 'PurchaseInvoice' } });
      this.hasMany(models.PurchasePaymentOrderDetails, { as: 'downPayments', scope: { referenceable_type: 'PurchaseDownPayment' } });
      this.hasMany(models.PurchasePaymentOrderDetails, { as: 'returns', scope: { referenceable_type: 'PurchaseReturn' } });
      this.hasMany(models.PurchasePaymentOrderDetails, { as: 'others', scope: { chart_of_account_id: { [Op.ne]: null } } });
      this.hasOne(models.Form, {
        as: 'form',
        foreignKey: 'formableId',
        constraints: false,
        scope: { formable_type: 'PurchasePaymentOrder' },
      });
    }
  }
  PurchasePaymentOrder.init(
    {
      paymentType: {
        type: DataTypes.STRING,
      },
      dueDate: {
        type: DataTypes.DATE,
      },
      amount: {
        type: DataTypes.DECIMAL,
      },
      supplierId: {
        type: DataTypes.INTEGER,
      },
      supplierName: {
        type: DataTypes.STRING,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'PurchasePaymentOrder',
      tableName: 'purchase_payment_orders',
      underscored: true,
      timestamps: false,
    }
  );
  return PurchasePaymentOrder;
};
