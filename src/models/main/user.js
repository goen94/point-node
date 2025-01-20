const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate() {}
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
      password: {
        type: DataTypes.STRING,
      },
      phoneConfirmationCode: {
        type: DataTypes.STRING,
      },
      phoneConfirmed: {
        type: DataTypes.BOOLEAN,
      },
      emailConfirmationCode: {
        type: DataTypes.INTEGER,
      },
      emailConfirmed: {
        type: DataTypes.BOOLEAN,
      },
      rememberToken: {
        type: DataTypes.STRING,
      },
      archivedBy: {
        type: DataTypes.STRING,
      },
      archivedAt: {
        type: DataTypes.DATE,
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
