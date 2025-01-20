const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class SalesVisitation extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.Form, { as: 'form', onDelete: 'CASCADE' });

      this.belongsTo(models.Customer, { as: 'customer', onDelete: 'RESTRICT' });

      this.belongsTo(models.Warehouse, { as: 'warehouse', onDelete: 'RESTRICT' });

      this.hasMany(models.SalesVisitationDetail, { as: 'items' });

      this.hasMany(models.SalesVisitationDetail, { as: 'itemsQuery' });
    }

    static getMorphType() {
      return 'SalesVisitation';
    }
  }
  SalesVisitation.init(
    {
      formId: {
        type: DataTypes.INTEGER,
      },
      customerId: {
        type: DataTypes.INTEGER,
      },
      branchId: {
        type: DataTypes.INTEGER,
      },
      warehouseId: {
        type: DataTypes.INTEGER,
      },
      name: {
        type: DataTypes.STRING,
      },
      group: {
        type: DataTypes.STRING,
      },
      address: {
        type: DataTypes.STRING,
      },
      district: {
        type: DataTypes.STRING,
      },
      subDistrict: {
        type: DataTypes.STRING,
      },
      phone: {
        type: DataTypes.STRING,
      },
      latitude: {
        type: DataTypes.STRING,
      },
      longitude: {
        type: DataTypes.STRING,
      },
      notes: {
        type: DataTypes.TEXT,
      },
      paymentMethod: {
        type: DataTypes.STRING,
      },
      dueDate: {
        type: DataTypes.DATE,
      },
      paymentReceived: {
        type: DataTypes.DECIMAL,
      },
      isRepeatOrder: {
        type: DataTypes.BOOLEAN,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'SalesVisitation',
      tableName: 'pin_point_sales_visitations',
      underscored: true,
    }
  );
  return SalesVisitation;
};
