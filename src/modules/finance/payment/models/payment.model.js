const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class Payment extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.ChartOfAccount, { as: 'chartOfAccount', foreignKey: 'paymentAccountId', onDelete: 'RESTRICT' });
      this.hasMany(models.PaymentDetail, { as: 'details' });
      this.hasOne(models.Form, {
        as: 'form',
        foreignKey: 'formableId',
        constraints: false,
        scope: { formable_type: 'Payment' },
      });
    }
  }
  Payment.init(
    {
      paymentType: {
        type: DataTypes.STRING,
      },
      paymentAccountId: {
        type: DataTypes.INTEGER,
      },
      disbursed: {
        type: DataTypes.TINYINT,
      },
      amount: {
        type: DataTypes.DECIMAL,
      },
      paymentableId: {
        type: DataTypes.INTEGER,
      },
      paymentableType: {
        type: DataTypes.STRING,
      },
      paymentableName: {
        type: DataTypes.STRING,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'Payment',
      tableName: 'payments',
      underscored: true,
      timestamps: false,
    }
  );
  return Payment;
};
