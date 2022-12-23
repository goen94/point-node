const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class PaymentDetail extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.ChartOfAccount, { as: 'chartOfAccount', foreignKey: 'chartOfAccountId' });
      this.belongsTo(models.Allocation, { as: 'allocation', foreignKey: 'allocationId', onDelete: 'SET NULL' });
      this.belongsTo(models.Payment, { as: 'payment', foreignKey: 'paymentId' });
    }
  }
  PaymentDetail.init(
    {
      paymentId: {
        type: DataTypes.INTEGER,
      },
      chartOfAccountId: {
        type: DataTypes.INTEGER,
      },
      allocationId: {
        type: DataTypes.INTEGER,
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
      modelName: 'PaymentDetail',
      tableName: 'payment_details',
      underscored: true,
      timestamps: false,
    }
  );
  return PaymentDetail;
};
