const { Model } = require('sequelize');
const moment = require('moment');

module.exports = (sequelize, DataTypes, projectCode) => {
  class Inventory extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.Warehouse, { as: 'warehouse', onDelete: 'RESTRICT' });

      this.belongsTo(models.Item, { as: 'item', onUpdate: 'CASCADE', onDelete: 'CASCADE' });

      this.belongsTo(models.Form, { as: 'form', onUpdate: 'CASCADE', onDelete: 'CASCADE' });
    }
  }
  Inventory.init(
    {
      formId: {
        type: DataTypes.INTEGER,
      },
      warehouseId: {
        type: DataTypes.INTEGER,
      },
      itemId: {
        type: DataTypes.INTEGER,
      },
      quantity: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('quantity'));
        },
      },
      expiryDate: {
        type: DataTypes.DATE,
        get() {
          if (this.getDataValue('expiryDate') === null) return null;

          return moment(this.getDataValue('expiryDate')).format('YYYY-MM-DD HH:mm:ss');
        },
      },
      productionNumber: {
        type: DataTypes.STRING,
      },
      needRecalculate: {
        type: DataTypes.BOOLEAN,
      },
      quantityReference: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('quantityReference'));
        },
      },
      unitReference: {
        type: DataTypes.STRING,
      },
      converterReference: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('converterReference'));
        },
      },
      isPosted: {
        type: DataTypes.BOOLEAN,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'Inventory',
      tableName: 'inventories',
      underscored: true,
    }
  );
  return Inventory;
};
