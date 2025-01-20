const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class RoleHasPermission extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.Permission, { as: 'permission' });
      this.belongsTo(models.Role);
    }
  }
  RoleHasPermission.init(
    {
      permissionId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      roleId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'RoleHasPermission',
      tableName: 'role_has_permissions',
      underscored: true,
      timestamps: false,
    }
  );
  return RoleHasPermission;
};
