const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class ModelHasRole extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.Role, { as: 'role' });
      this.belongsTo(models.User, { foreignKey: 'modelId', constraints: false });
    }
  }
  ModelHasRole.init(
    {
      roleId: {
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
      modelName: 'ModelHasRole',
      tableName: 'model_has_roles',
      underscored: true,
      timestamps: false,
    }
  );
  return ModelHasRole;
};
