const { v4: uuidv4 } = require('uuid');
const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const awsS3Uploader = require('@src/utils/awsS3Uploader');

class UploadSettingLogo {
  constructor(tenantDatabase, { user, image }) {
    this.tenantDatabase = tenantDatabase;
    this.user = user;
    this.image = image;
  }

  async call() {
    if (!this.image) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Image is required');
    }
    const tenantName = this.tenantDatabase.sequelize.config.database.replace('point_', '');
    const imageName = uuidv4();
    const imagePath = `${tenantName}/settingLogo/${imageName}`;
    const { publicUrl } = await awsS3Uploader({ file: this.image, imageName, imagePath });

    let currentLogo = await this.tenantDatabase.SettingLogo.findOne();
    if (!currentLogo) {
      currentLogo = await this.tenantDatabase.SettingLogo.create({
        path: imagePath,
        publicUrl,
        createdBy: this.user.id,
        updatedBy: this.user.id,
      });

      return { settingLogo: currentLogo };
    }

    currentLogo = await currentLogo.update({
      path: imagePath,
      publicUrl,
      updatedBy: this.user.id,
    });

    return { settingLogo: currentLogo };
  }
}

module.exports = UploadSettingLogo;
