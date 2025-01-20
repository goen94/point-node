const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class ChartOfAccountType extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.User, { as: 'createdByUser', foreignKey: 'createdBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'updatedByUser', foreignKey: 'updatedBy', onDelete: 'RESTRICT' });
    }
  }
  ChartOfAccountType.init(
    {
      name: {
        type: DataTypes.STRING,
      },
      alias: {
        type: DataTypes.STRING,
      },
      isDebit: {
        type: DataTypes.BOOLEAN,
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
      modelName: 'ChartOfAccountType',
      tableName: 'chart_of_account_types',
      underscored: true,
    }
  );
  return ChartOfAccountType;
};
