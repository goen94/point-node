const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class User extends Model {
    static associate({ [projectCode]: models }) {
      this.hasOne(models.ModelHasRole, {
        as: 'modelHasRole',
        foreignKey: 'modelId',
        constraints: false,
        scope: { modelType: 'App\\Model\\Master\\User' },
      });

      this.belongsToMany(models.Branch, {
        as: 'branches',
        foreignKey: 'userId',
        otherKey: 'branchId',
        through: models.BranchUser,
      });

      this.belongsToMany(models.Warehouse, {
        as: 'warehouses',
        foreignKey: 'userId',
        otherKey: 'warehouseId',
        through: models.UserWarehouse,
      });
    }

    async isPermitted(requiredPermissions) {
      const role = await this.getModelHasRole();
      if (!role) {
        return false;
      }

      const roleHasPermissions = await sequelize.models.RoleHasPermission.findAll({
        where: {
          roleId: role.roleId,
        },
        include: [{ model: sequelize.models.Permission, as: 'permission' }],
      });
      const permissions = roleHasPermissions.map((roleHasPermission) => {
        return roleHasPermission.permission.name;
      });

      return requiredPermissions.every((requiredPermission) => permissions.includes(requiredPermission));
    }
  }
  User.init(
    {
      name: {
        type: DataTypes.STRING,
      },
      firstName: {
        type: DataTypes.STRING,
      },
      lastName: {
        type: DataTypes.STRING,
      },
      address: {
        type: DataTypes.STRING,
      },
      phone: {
        type: DataTypes.STRING,
      },
      email: {
        type: DataTypes.STRING,
      },
      branchId: {
        type: DataTypes.INTEGER,
      },
      fullName: {
        type: DataTypes.VIRTUAL,
        get() {
          return `${this.firstName} ${this.lastName}`;
        },
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
    }
  );
  return User;
};
