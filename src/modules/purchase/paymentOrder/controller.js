const httpStatus = require('http-status');
const catchAsync = require('@src/utils/catchAsync');
const apiServices = require('./services/apis');

const findAll = catchAsync(async (req, res) => {
  const { currentTenantDatabase, user, query: queries } = req;
  const { total, paymentOrder, maxItem, currentPage, totalPage } = await new apiServices.FindAll(
    currentTenantDatabase,
    user,
    queries
  ).call();
  res.status(httpStatus.OK).send({
    data: paymentOrder,
    meta: {
      current_page: currentPage,
      last_page: totalPage,
      per_page: maxItem,
      total,
    },
  });
});

const findAllReferenceForm = catchAsync(async (req, res) => {
  const { currentTenantDatabase, params: { supplierId } } = req;
  const { invoices, downPayments } = await new apiServices.FindAllReferenceForm(currentTenantDatabase, supplierId).call();
  res.status(httpStatus.OK).send({
    data: { ...invoices, ...downPayments },
  });
});

const findOne = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user,
    params: { id },
  } = req;
  const { paymentOrder } = await new apiServices.FindOne(currentTenantDatabase, user, id,).call();
  res.status(httpStatus.OK).send({ data: paymentOrder });
});

const createFormRequest = catchAsync(async (req, res) => {
  const { currentTenantDatabase, user: maker, body: createFormRequestDto } = req;
  const { paymentOrder, paymentOrderDetails, paymentOrderForm } = 
  await new apiServices.CreateFormRequest(currentTenantDatabase, {
    maker,
    createFormRequestDto,
  }).call();

  const data = {
    ...paymentOrder.toJSON(),
    invoices: paymentOrderDetails.paymentOrderInvoices,
    downPayments: paymentOrderDetails.paymentOrderDownPayments,
    returns: paymentOrderDetails.paymentOrderReturns,
    others: paymentOrderDetails.paymentOrderOthers,
    form: paymentOrderForm,
  }

  res.status(httpStatus.CREATED).send({ data });
});

const updateFormRequest = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: maker,
    params: { id },
    body: updateFormDto
  } = req;
  const { paymentOrder, paymentOrderDetails, paymentOrderForm } = 
  await new apiServices.UpdateForm(currentTenantDatabase, {
    maker,
    paymentOrderId: id,
    updateFormDto,
  }).call();

  const data = {
    ...paymentOrder.toJSON(),
    invoices: paymentOrderDetails.paymentOrderInvoices,
    downPayments: paymentOrderDetails.paymentOrderDownPayments,
    returns: paymentOrderDetails.paymentOrderReturns,
    others: paymentOrderDetails.paymentOrderOthers,
    form: paymentOrderForm,
  }

  res.status(httpStatus.CREATED).send({ data });
});

const createFormApprove = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: approver,
    params: { id },
  } = req;

  const { paymentOrder } = await new apiServices.CreateFormApprove(currentTenantDatabase, {
    approver,
    paymentOrderId: id,
  }).call();
  res.status(httpStatus.OK).send({ data: paymentOrder });
});

const createFormReject = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: approver,
    params: { id },
    body: createFormRejectDto,
  } = req;
  const { paymentOrder } = await new apiServices.CreateFormReject(currentTenantDatabase, {
    approver,
    paymentOrderId: id,
    createFormRejectDto,
  }).call();
  res.status(httpStatus.OK).send({ data: paymentOrder });
});

const deleteFormRequest = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: maker,
    params: { id },
    body: deleteFormRequestDto,
  } = req;
  await new apiServices.DeleteFormRequest(currentTenantDatabase, {
    maker,
    paymentOrderId: id,
    deleteFormRequestDto,
  }).call();
  res.status(httpStatus.NO_CONTENT).send();
});

const deleteFormApprove = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: approver,
    params: { id },
  } = req;
  const { paymentOrder } = await new apiServices.DeleteFormApprove(currentTenantDatabase, {
    approver,
    paymentOrderId: id,
  }).call();
  res.status(httpStatus.OK).send({ data: paymentOrder });
});

const deleteFormReject = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: approver,
    params: { id },
    body: deleteFormRejectDto,
  } = req;
  const { paymentOrder } = await new apiServices.DeleteFormReject(currentTenantDatabase, {
    approver,
    paymentOrderId: id,
    deleteFormRejectDto,
  }).call();
  res.status(httpStatus.OK).send({ data: paymentOrder });
});

const sendEmail = catchAsync(async (req, res) => {
  const { currentTenantDatabase } = req;
  await new apiServices.SendEmail(currentTenantDatabase).call();

  res.status(httpStatus.CREATED).send();
});

module.exports = {
  findAll,
  findOne,
  sendEmail,
  createFormApprove,
  createFormRequest,
  createFormReject,
  updateFormRequest,
  deleteFormRequest,
  deleteFormApprove,
  deleteFormReject,
  findAllReferenceForm,
};
