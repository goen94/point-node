const { Model } = require('sequelize');
const moment = require('moment');

module.exports = (sequelize, DataTypes, projectCode) => {
  class SalesInvoiceItem extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.SalesInvoice, { as: 'salesInvoice', onDelete: 'CASCADE' });

      this.belongsTo(models.Item, { as: 'item', onDelete: 'RESTRICT' });

      this.belongsTo(models.Allocation, { as: 'allocation', onDelete: 'RESTRICT' });

      this.belongsTo(models.PosBill, { as: 'posBill', foreignKey: 'referenceableId', constraints: false });

      this.belongsTo(models.DeliveryNote, { as: 'salesDeliveryNote', foreignKey: 'referenceableId', constraints: false });

      this.belongsTo(models.SalesVisitation, { as: 'salesVisitation', foreignKey: 'referenceableId', constraints: false });

      this.belongsTo(models.DeliveryNoteItem, {
        as: 'salesDeliveryNoteItem',
        foreignKey: 'itemReferenceableId',
        constraints: false,
      });

      this.belongsTo(models.SalesVisitationDetail, {
        as: 'salesVisitationDetail',
        foreignKey: 'itemReferenceableId',
        constraints: false,
      });
    }

    getTotalPrice() {
      if (this.discountValue && this.discountValue > 0) {
        return this.quantity * (this.price - this.discountValue);
      }

      return this.quantity * this.price;
    }
  }
  SalesInvoiceItem.init(
    {
      salesInvoiceId: {
        type: DataTypes.INTEGER,
      },
      referenceableType: {
        type: DataTypes.STRING,
      },
      referenceableId: {
        type: DataTypes.INTEGER,
      },
      itemReferenceableType: {
        type: DataTypes.STRING,
      },
      itemReferenceableId: {
        type: DataTypes.INTEGER,
      },
      itemId: {
        type: DataTypes.INTEGER,
      },
      itemName: {
        type: DataTypes.STRING,
      },
      quantity: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('quantity'));
        },
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
      quantityReturned: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('quantityReturned'));
        },
      },
      quantityRemaining: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('quantityRemaining'));
        },
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'SalesInvoiceItem',
      tableName: 'sales_invoice_items',
      underscored: true,
      timestamps: false,
    }
  );
  return SalesInvoiceItem;
};
