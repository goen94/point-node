const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class Branch extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.User, { as: 'createdByUser', foreignKey: 'createdBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'updatedByUser', foreignKey: 'updatedBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'archivedByUser', foreignKey: 'archivedBy', onDelete: 'RESTRICT' });

      this.belongsToMany(models.User, { foreignKey: 'branchId', otherKey: 'userId', through: models.BranchUser });
    }
  }
  Branch.init(
    {
      name: {
        type: DataTypes.STRING,
      },
      address: {
        type: DataTypes.TEXT,
      },
      phone: {
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
      modelName: 'Branch',
      tableName: 'branches',
      underscored: true,
    }
  );
  return Branch;
};
