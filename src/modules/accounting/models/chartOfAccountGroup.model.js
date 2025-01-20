const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class ChartOfAccountGroup extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.User, { as: 'createdByUser', foreignKey: 'createdBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'updatedByUser', foreignKey: 'updatedBy', onDelete: 'RESTRICT' });
    }
  }
  ChartOfAccountGroup.init(
    {
      name: {
        type: DataTypes.STRING,
      },
      alias: {
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
      modelName: 'ChartOfAccountGroup',
      tableName: 'chart_of_account_groups',
      underscored: true,
    }
  );
  return ChartOfAccountGroup;
};
