const httpStatus = require('http-status');
const catchAsync = require('@src/utils/catchAsync');
const apiServices = require('./services/apis');

const findAll = catchAsync(async (req, res) => {
  const { currentTenantDatabase, query: queries } = req;
  const { items } = await new apiServices.FindAll(currentTenantDatabase, queries).call();
  res.status(httpStatus.OK).send({
    data: items,
  });
});

module.exports = {
  findAll,
};
