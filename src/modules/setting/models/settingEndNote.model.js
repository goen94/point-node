const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes /* , projectCode */) => {
  class SettingEndNote extends Model {
    // static associate({ [projectCode]: models }) {}
  }
  SettingEndNote.init(
    {
      purchaseRequest: {
        type: DataTypes.STRING,
      },
      purchaseOrder: {
        type: DataTypes.STRING,
      },
      purchaseDownPayment: {
        type: DataTypes.STRING,
      },
      purchaseReceive: {
        type: DataTypes.STRING,
      },
      purchaseInvoice: {
        type: DataTypes.STRING,
      },
      purchaseReturn: {
        type: DataTypes.STRING,
      },
      paymentOrderPurchase: {
        type: DataTypes.STRING,
      },
      pointOfSales: {
        type: DataTypes.STRING,
      },
      salesQuotation: {
        type: DataTypes.STRING,
      },
      salesOrder: {
        type: DataTypes.STRING,
      },
      salesDownPayment: {
        type: DataTypes.STRING,
      },
      salesInvoice: {
        type: DataTypes.STRING,
      },
      salesReturn: {
        type: DataTypes.STRING,
      },
      paymentCollectionSales: {
        type: DataTypes.STRING,
      },
      expeditionOrder: {
        type: DataTypes.STRING,
      },
      expeditionDownPayment: {
        type: DataTypes.STRING,
      },
      expeditionInvoice: {
        type: DataTypes.STRING,
      },
      paymentOrderExpedition: {
        type: DataTypes.STRING,
      },
      createdBy: {
        type: DataTypes.INTEGER,
      },
      updatedBy: {
        type: DataTypes.INTEGER,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'SettingEndNote',
      tableName: 'setting_end_notes',
      underscored: true,
    }
  );
  return SettingEndNote;
};
