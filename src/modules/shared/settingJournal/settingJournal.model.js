const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class SettingJournal extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.ChartOfAccount, { onDelete: 'SET NULL' });
    }
  }
  SettingJournal.init(
    {
      feature: {
        type: DataTypes.STRING,
      },
      name: {
        type: DataTypes.STRING,
      },
      description: {
        type: DataTypes.TEXT,
      },
      chartOfAccountId: {
        type: DataTypes.INTEGER,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'SettingJournal',
      tableName: 'setting_journals',
      underscored: true,
    }
  );
  return SettingJournal;
};
