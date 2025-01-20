const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class ItemUnit extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.User, { as: 'createdByUser', foreignKey: 'createdBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'updatedByUser', foreignKey: 'updatedBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.Item, { onDelete: 'CASCADE' });
    }
  }
  ItemUnit.init(
    {
      label: {
        type: DataTypes.STRING,
      },
      name: {
        type: DataTypes.STRING,
      },
      converter: {
        type: DataTypes.DECIMAL,
        get() {
          return parseFloat(this.getDataValue('converter'));
        },
      },
      disabled: {
        type: DataTypes.BOOLEAN,
      },
      itemId: {
        type: DataTypes.INTEGER,
      },
      createdBy: {
        type: DataTypes.INTEGER,
      },
      updatedBy: {
        type: DataTypes.INTEGER,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'ItemUnit',
      tableName: 'item_units',
      underscored: true,
    }
  );
  return ItemUnit;
};
