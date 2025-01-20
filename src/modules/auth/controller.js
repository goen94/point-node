// https://api.point.red/api/v1/auth/fetch

const httpStatus = require('http-status');
const catchAsync = require('@src/utils/catchAsync');
const getTokenService = require('./services/getToken.service');

const getToken = catchAsync(async (req, res) => {
  const jwtoken = await getTokenService(req.body);
  res.status(httpStatus.OK).send({ token: jwtoken });
});

module.exports = {
  getToken,
};
