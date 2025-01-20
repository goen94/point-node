const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes /* , projectCode */) => {
  class SettingLogo extends Model {
    // static associate({ [projectCode]: models }) {}
  }
  SettingLogo.init(
    {
      path: {
        type: DataTypes.STRING,
      },
      publicUrl: {
        type: DataTypes.STRING,
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
      modelName: 'SettingLogo',
      tableName: 'setting_logos',
      underscored: true,
    }
  );
  return SettingLogo;
};
