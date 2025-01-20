const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class SalesInvoice extends Model {
    static associate({ [projectCode]: models }) {
      this.hasMany(models.SalesInvoiceItem, { as: 'items' });

      this.belongsTo(models.Customer, { as: 'customer' });

      this.belongsTo(models.DeliveryNote, { as: 'salesDeliveryNote', foreignKey: 'referenceableId', constraints: false });

      this.belongsTo(models.SalesVisitation, { as: 'salesVisitation', foreignKey: 'referenceableId', constraints: false });

      this.hasOne(models.Form, {
        as: 'form',
        foreignKey: 'formableId',
        constraints: false,
        scope: { formable_type: 'SalesInvoice' },
      });
    }

    getReferenceable(options) {
      const referenceableTypes = ['SalesDeliveryNote', 'SalesVisitation'];
      if (!referenceableTypes.includes(this.referenceableType)) return Promise.resolve(null);
      const mixinMethodName = `get${this.referenceableType}`;
      return this[mixinMethodName](options);
    }

    async setReferenceable(options) {
      const referenceableTypes = ['SalesDeliveryNote', 'SalesVisitation'];
      if (!referenceableTypes.includes(this.referenceableType)) return;

      const mixinMethodName = `get${this.referenceableType}`;
      this.dataValues.referenceable = await this[mixinMethodName](options);
    }

    async getTotalDetails() {
      const items = await this.getItems();
      const subTotal = await getSubTotal(items);
      const taxBase = getTaxBase(subTotal, this.discountValue, this.discountPercent);

      return {
        subTotal,
        taxBase,
        tax: parseFloat(this.tax),
        amount: parseFloat(this.amount),
      };
    }
  }
  SalesInvoice.init(
    {
      dueDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      discountPercent: {
        type: DataTypes.DECIMAL,
        defaultValue: 0,
        get() {
          return parseFloat(this.getDataValue('discountPercent'));
        },
      },
      discountValue: {
        type: DataTypes.DECIMAL,
        defaultValue: 0,
        get() {
          return parseFloat(this.getDataValue('discountValue'));
        },
      },
      tax: {
        type: DataTypes.DECIMAL,
        allowNull: false,
        get() {
          return parseFloat(this.getDataValue('tax'));
        },
      },
      typeOfTax: {
        type: DataTypes.STRING,
        validate: {
          isIn: [['include', 'exclude', 'non']],
        },
      },
      amount: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('amount'));
        },
      },
      remaining: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('remaining'));
        },
      },
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      customerName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      customerAddress: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      customerPhone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      referenceableId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      referenceableType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'SalesInvoice',
      tableName: 'sales_invoices',
      underscored: true,
      timestamps: false,
    }
  );
  return SalesInvoice;
};

async function getSubTotal(items) {
  const subTotal = await items.reduce(async (resultPromise, item) => {
    const result = await resultPromise;
    const itemsPrice = await getItemsPrice(item);
    return result + itemsPrice;
  }, 0);

  return subTotal;
}

async function getItemsPrice(item) {
  const totalItemPrice = await item.getTotalPrice();

  return totalItemPrice;
}

function getTaxBase(subTotal, discountValue, discountPercent) {
  if (discountValue > 0) {
    return subTotal - discountValue;
  }

  if (discountPercent > 0) {
    return subTotal - subTotal * (discountPercent / 100);
  }

  return subTotal;
}
