const httpStatus = require('http-status');
const catchAsync = require('@src/utils/catchAsync');
const apiServices = require('./services/apis');

const getSettingLogo = catchAsync(async (req, res) => {
  const { currentTenantDatabase } = req;
  const { settingLogo } = await new apiServices.GetSettingLogo(currentTenantDatabase).call();
  res.status(httpStatus.CREATED).send({ data: settingLogo });
});

const uploadSettingLogo = catchAsync(async (req, res) => {
  const { currentTenantDatabase, user, file } = req;
  const { settingLogo } = await new apiServices.UploadSettingLogo(currentTenantDatabase, { user, image: file }).call();
  res.status(httpStatus.CREATED).send({ data: settingLogo });
});

const getSettingEndNote = catchAsync(async (req, res) => {
  const { currentTenantDatabase } = req;
  const { settingEndNote } = await new apiServices.GetSettingEndNote(currentTenantDatabase).call();
  res.status(httpStatus.OK).send({ data: settingEndNote });
});

const updateSettingEndNote = catchAsync(async (req, res) => {
  const { currentTenantDatabase, user, body: updateSettingEndNoteDto } = req;
  const { settingEndNote } = await new apiServices.UpdateSettingEndNote(currentTenantDatabase, {
    user,
    updateSettingEndNoteDto,
  }).call();
  res.status(httpStatus.CREATED).send({ data: settingEndNote });
});

module.exports = {
  getSettingLogo,
  uploadSettingLogo,
  getSettingEndNote,
  updateSettingEndNote,
};
