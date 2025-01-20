const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class ModelHasPermission extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.Permission);
    }
  }
  ModelHasPermission.init(
    {
      permissionId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      modelId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      modelType: {
        type: DataTypes.STRING,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'ModelHasPermission',
      tableName: 'model_has_permissions',
      underscored: true,
      timestamps: false,
    }
  );
  return ModelHasPermission;
};
