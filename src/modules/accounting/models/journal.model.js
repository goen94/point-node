const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class Journal extends Model {
    static associate({ [projectCode]: models }) {
      // this.belongsTo(models.ChartOfAccount, { foreignKey: 'chartOfAccountId', onUpdate: 'CASCADE', onDelete: 'CASCADE' });
      this.belongsTo(models.Form, { foreignKey: 'formIdReference', onUpdate: 'CASCADE', onDelete: 'CASCADE' });
      this.belongsTo(models.Form, { foreignKey: 'formId', onUpdate: 'CASCADE', onDelete: 'CASCADE' });
    }
  }
  Journal.init(
    {
      formId: {
        type: DataTypes.INTEGER,
      },
      formIdReference: {
        type: DataTypes.INTEGER,
      },
      chartOfAccountId: {
        type: DataTypes.INTEGER,
      },
      debit: {
        type: DataTypes.DECIMAL,
      },
      credit: {
        type: DataTypes.DECIMAL,
      },
      journalableId: {
        type: DataTypes.INTEGER,
      },
      journalableType: {
        type: DataTypes.STRING,
      },
      notes: {
        type: DataTypes.TEXT,
      },
      isPosted: {
        type: DataTypes.BOOLEAN,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'Journal',
      tableName: 'journals',
      underscored: true,
    }
  );
  return Journal;
};
