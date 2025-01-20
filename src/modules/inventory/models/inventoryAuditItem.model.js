const { Model } = require('sequelize');
const moment = require('moment');

module.exports = (sequelize, DataTypes, projectCode) => {
  class InventoryAuditItem extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.InventoryAudit, { as: 'inventoryAudit', onUpdate: 'CASCADE', onDelete: 'CASCADE' });

      this.belongsTo(models.Item, { as: 'item', onUpdate: 'RESTRICT', onDelete: 'RESTRICT' });
    }
  }
  InventoryAuditItem.init(
    {
      inventoryAuditId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      itemId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.DECIMAL.UNSIGNED,
        allowNull: false,
        get() {
          return parseFloat(this.getDataValue('quantity'));
        },
      },
      expiryDate: {
        type: DataTypes.DATE,
        allowNull: true,
        get() {
          if (this.getDataValue('expiryDate') === null) return null;

          return moment(this.getDataValue('expiryDate')).format('YYYY-MM-DD HH:mm:ss');
        },
      },
      productionNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      price: {
        type: DataTypes.DECIMAL.UNSIGNED,
        allowNull: false,
        get() {
          return parseFloat(this.getDataValue('price'));
        },
      },
      unit: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      converter: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('converter'));
        },
      },
      notes: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'InventoryAuditItem',
      tableName: 'inventory_audit_items',
      underscored: true,
      timestamps: false,
    }
  );
  return InventoryAuditItem;
};
