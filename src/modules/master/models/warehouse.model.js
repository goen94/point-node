const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class Warehouse extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.Branch, { onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'createdByUser', foreignKey: 'createdBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'updatedByUser', foreignKey: 'updatedBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'archivedByUser', foreignKey: 'archivedBy', onDelete: 'RESTRICT' });

      this.belongsToMany(models.User, { foreignKey: 'warehouseId', otherKey: 'userId', through: models.UserWarehouse });
    }
  }
  Warehouse.init(
    {
      code: {
        type: DataTypes.STRING,
      },
      name: {
        type: DataTypes.STRING,
      },
      address: {
        type: DataTypes.TEXT,
      },
      phone: {
        type: DataTypes.STRING,
      },
      notes: {
        type: DataTypes.TEXT,
      },
      branchId: {
        type: DataTypes.INTEGER,
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
      modelName: 'Warehouse',
      tableName: 'warehouses',
      underscored: true,
    }
  );
  return Warehouse;
};
