const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class UserActivity extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.User, { as: 'user' });
    }
  }
  UserActivity.init(
    {
      tableType: {
        type: DataTypes.STRING,
      },
      tableId: {
        type: DataTypes.INTEGER,
      },
      number: {
        type: DataTypes.STRING,
      },
      date: {
        type: DataTypes.DATE,
      },
      userId: {
        type: DataTypes.INTEGER,
      },
      activity: {
        type: DataTypes.STRING,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'UserActivity',
      tableName: 'user_activities',
      underscored: true,
      timestamps: false,
    }
  );
  return UserActivity;
};
