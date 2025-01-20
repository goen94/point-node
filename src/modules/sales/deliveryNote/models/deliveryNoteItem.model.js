const { Model } = require('sequelize');
const moment = require('moment');

module.exports = (sequelize, DataTypes, projectCode) => {
  class DeliveryNoteItem extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.DeliveryNote, { onDelete: 'CASCADE' });

      this.belongsTo(models.Item, { as: 'item', onDelete: 'RESTRICT' });

      this.belongsTo(models.Allocation, { as: 'allocation', onDelete: 'RESTRICT' });

      this.belongsTo(models.DeliveryOrderItem, { as: 'deliveryOrderItem' });
    }

    static getMorphType() {
      return 'SalesDeliveryNoteItem';
    }
  }
  DeliveryNoteItem.init(
    {
      deliveryNoteId: {
        type: DataTypes.INTEGER,
      },
      deliveryOrderItemId: {
        type: DataTypes.INTEGER,
      },
      itemId: {
        type: DataTypes.INTEGER,
      },
      itemName: {
        type: DataTypes.STRING,
      },
      grossWeight: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('grossWeight'));
        },
      },
      tareWeight: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('tareWeight'));
        },
      },
      netWeight: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('netWeight'));
        },
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
      price: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('price'));
        },
      },
      discountPercent: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('discountPercent'));
        },
      },
      discountValue: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('discountValue'));
        },
      },
      taxable: {
        type: DataTypes.BOOLEAN,
      },
      unit: {
        type: DataTypes.STRING,
      },
      converter: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('converter'));
        },
      },
      notes: {
        type: DataTypes.TEXT,
      },
      allocationId: {
        type: DataTypes.INTEGER,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'DeliveryNoteItem',
      tableName: 'delivery_note_items',
      underscored: true,
      timestamps: false,
    }
  );
  return DeliveryNoteItem;
};
