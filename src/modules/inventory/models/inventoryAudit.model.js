const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class InventoryAudit extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.Warehouse, { as: 'warehouse', onUpdate: 'RESTRICT', onDelete: 'RESTRICT' });

      this.hasOne(models.Form, {
        as: 'form',
        foreignKey: 'formableId',
        constraints: false,
        scope: { formable_type: 'InventoryAudit' },
      });
    }
  }
  InventoryAudit.init(
    {
      warehouseId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'InventoryAudit',
      tableName: 'inventory_audits',
      underscored: true,
      timestamps: false,
    }
  );
  return InventoryAudit;
};
