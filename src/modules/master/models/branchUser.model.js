const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class BranchUser extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.User, { onDelete: 'CASCADE' });

      this.belongsTo(models.Branch, { onDelete: 'CASCADE' });
    }
  }
  BranchUser.init(
    {
      userId: {
        type: DataTypes.INTEGER,
      },
      branchId: {
        type: DataTypes.INTEGER,
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'BranchUser',
      tableName: 'branch_user',
      underscored: true,
      timestamps: false,
    }
  );
  return BranchUser;
};
