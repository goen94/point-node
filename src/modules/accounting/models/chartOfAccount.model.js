const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class ChartOfAccount extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.User, { as: 'createdByUser', foreignKey: 'createdBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'updatedByUser', foreignKey: 'updatedBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'archivedByUser', foreignKey: 'archivedBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.ChartOfAccountType, { as: 'type', foreignKey: 'typeId', onDelete: 'RESTRICT' });

      this.belongsTo(models.ChartOfAccountGroup, { as: 'group', foreignKey: 'groupId', onDelete: 'SET NULL' });
    }
  }
  ChartOfAccount.init(
    {
      typeId: {
        type: DataTypes.INTEGER,
      },
      groupId: {
        type: DataTypes.INTEGER,
      },
      isSubLedger: {
        type: DataTypes.BOOLEAN,
      },
      subLedger: {
        type: DataTypes.STRING,
      },
      position: {
        type: DataTypes.STRING,
      },
      isLocked: {
        type: DataTypes.BOOLEAN,
      },
      cashFlow: {
        type: DataTypes.STRING,
      },
      cashFlowPosition: {
        type: DataTypes.STRING,
      },
      number: {
        type: DataTypes.STRING,
      },
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
      archivedBy: {
        type: DataTypes.INTEGER,
      },
      archivedAt: {
        type: DataTypes.DATE,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'ChartOfAccount',
      tableName: 'chart_of_accounts',
      underscored: true,
    }
  );
  return ChartOfAccount;
};
