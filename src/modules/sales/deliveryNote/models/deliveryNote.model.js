const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class DeliveryNote extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.Customer, { as: 'customer', onDelete: 'RESTRICT' });

      this.belongsTo(models.Warehouse, { as: 'warehouse', onDelete: 'RESTRICT' });

      this.belongsTo(models.DeliveryOrder, { as: 'deliveryOrder', onDelete: 'RESTRICT' });

      this.hasMany(models.DeliveryNoteItem, { as: 'itemsQuery' });

      this.hasMany(models.DeliveryNoteItem, { as: 'items' });

      this.hasOne(models.Form, {
        as: 'form',
        foreignKey: 'formableId',
        constraints: false,
        scope: { formable_type: 'SalesDeliveryNote' },
      });
    }

    static getMorphType() {
      return 'SalesDeliveryNote';
    }
  }
  DeliveryNote.init(
    {
      customerId: {
        type: DataTypes.INTEGER,
      },
      customerName: {
        type: DataTypes.STRING,
      },
      customerAddress: {
        type: DataTypes.STRING,
      },
      customerPhone: {
        type: DataTypes.STRING,
      },
      billingAddress: {
        type: DataTypes.STRING,
      },
      billingPhone: {
        type: DataTypes.STRING,
      },
      billingEmail: {
        type: DataTypes.STRING,
      },
      shippingAddress: {
        type: DataTypes.STRING,
      },
      shippingPhone: {
        type: DataTypes.STRING,
      },
      shippingEmail: {
        type: DataTypes.STRING,
      },
      warehouseId: {
        type: DataTypes.INTEGER,
      },
      deliveryOrderId: {
        type: DataTypes.INTEGER,
      },
      driver: {
        type: DataTypes.STRING,
      },
      licensePlate: {
        type: DataTypes.STRING,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'DeliveryNote',
      tableName: 'delivery_notes',
      underscored: true,
      timestamps: false,
    }
  );
  return DeliveryNote;
};
