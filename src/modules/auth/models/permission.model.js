const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes /* , projectCode */) => {
  class Permission extends Model {
    static associate(/* { [projectCode]: models } */) {}
  }
  Permission.init(
    {
      name: {
        type: DataTypes.STRING,
      },
      guardName: {
        type: DataTypes.STRING,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'Permission',
      tableName: 'permissions',
      underscored: true,
    }
  );
  return Permission;
};
