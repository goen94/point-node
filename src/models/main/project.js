const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Project extends Model {
    static associate() {}
  }
  Project.init(
    {
      code: {
        type: DataTypes.STRING,
      },
      name: {
        type: DataTypes.STRING,
      },
      totalUser: {
        type: DataTypes.INTEGER,
      },
      group: {
        type: DataTypes.STRING,
      },
      timezone: {
        type: DataTypes.STRING,
      },
      address: {
        type: DataTypes.TEXT,
      },
      phone: {
        type: DataTypes.STRING,
      },
      whatsapp: {
        type: DataTypes.STRING,
      },
      website: {
        type: DataTypes.STRING,
      },
      marketplaceNotes: {
        type: DataTypes.TEXT,
      },
      vatIdNumber: {
        type: DataTypes.STRING,
      },
      ownerId: {
        type: DataTypes.INTEGER,
      },
      invitationCode: {
        type: DataTypes.STRING,
      },
      invitationCodeEnabled: {
        type: DataTypes.BOOLEAN,
      },
      isGenerated: {
        type: DataTypes.BOOLEAN,
      },
      packageId: {
        type: DataTypes.INTEGER,
      },
      expiredDate: {
        type: DataTypes.DATE,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'Project',
      tableName: 'projects',
      underscored: true,
    }
  );
  return Project;
};
