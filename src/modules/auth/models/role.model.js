const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes /* , projectCode */) => {
  class Role extends Model {
    static associate(/* { [projectCode]: models } */) {}
  }
  Role.init(
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
      modelName: 'Role',
      tableName: 'roles',
      underscored: true,
    }
  );
  return Role;
};
