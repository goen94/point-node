const httpStatus = require('http-status');
const catchAsync = require('@src/utils/catchAsync');
const apiServices = require('./services/apis');

const findAll = catchAsync(async (req, res) => {
  const { currentTenantDatabase, query: queries } = req;
  const { total, salesInvoices, maxItem, currentPage, totalPage } = await new apiServices.FindAll(
    currentTenantDatabase,
    queries
  ).call();
  res.status(httpStatus.OK).send({
    data: salesInvoices,
    meta: {
      current_page: currentPage,
      last_page: totalPage,
      per_page: maxItem,
      total,
    },
  });
});

const findAllReferenceForm = catchAsync(async (req, res) => {
  const { currentTenantDatabase, query: queries } = req;
  const { total, formReferences, maxItem, currentPage, totalPage } = await new apiServices.FindAllReferenceForm(
    currentTenantDatabase,
    queries
  ).call();
  res.status(httpStatus.OK).send({
    data: formReferences,
    meta: {
      current_page: currentPage,
      last_page: totalPage,
      per_page: maxItem,
      total,
    },
  });
});

const findOne = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    params: { salesInvoiceId },
  } = req;
  const { salesInvoice } = await new apiServices.FindOne(currentTenantDatabase, salesInvoiceId).call();
  res.status(httpStatus.OK).send({ data: salesInvoice });
});

const createFormRequest = catchAsync(async (req, res) => {
  const { currentTenantDatabase, user: maker, body: createFormRequestDto } = req;
  const salesInvoice = await new apiServices.CreateFormRequest(currentTenantDatabase, {
    maker,
    createFormRequestDto,
  }).call();

  res.status(httpStatus.CREATED).send({ data: salesInvoice });
});

const createFormApprove = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: approver,
    params: { salesInvoiceId },
  } = req;
  const { salesInvoice } = await new apiServices.CreateFormApprove(currentTenantDatabase, {
    approver,
    salesInvoiceId,
  }).call();
  res.status(httpStatus.OK).send({ data: salesInvoice });
});

const createFormApproveByToken = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    body: { token },
  } = req;

  const { salesInvoice, project } = await new apiServices.CreateFormApproveByToken(currentTenantDatabase, token).call();
  res.status(httpStatus.OK).send({ data: salesInvoice, meta: { projectName: project.name } });
});

const createFormReject = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: approver,
    params: { salesInvoiceId },
    body: createFormRejectDto,
  } = req;
  const salesInvoice = await new apiServices.CreateFormReject(currentTenantDatabase, {
    approver,
    salesInvoiceId,
    createFormRejectDto,
  }).call();
  res.status(httpStatus.OK).send({ data: salesInvoice });
});

const createFormRejectByToken = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    body: { token },
  } = req;

  const { salesInvoice, project } = await new apiServices.CreateFormRejectByToken(currentTenantDatabase, token).call();
  res.status(httpStatus.OK).send({ data: salesInvoice, meta: { projectName: project.name } });
});

const updateForm = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: maker,
    params: { salesInvoiceId },
    body: updateFormDto,
  } = req;
  const { salesInvoice } = await new apiServices.UpdateForm(currentTenantDatabase, {
    maker,
    salesInvoiceId,
    updateFormDto,
  }).call();
  res.status(httpStatus.OK).send({ data: salesInvoice });
});

const deleteFormRequest = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: maker,
    params: { salesInvoiceId },
    body: deleteFormRequestDto,
  } = req;
  const { salesInvoice } = await new apiServices.DeleteFormRequest(currentTenantDatabase, {
    maker,
    salesInvoiceId,
    deleteFormRequestDto,
  }).call();
  res.status(httpStatus.OK).send({ data: salesInvoice });
});

const deleteFormApprove = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: approver,
    params: { salesInvoiceId },
  } = req;
  const { salesInvoice } = await new apiServices.DeleteFormApprove(currentTenantDatabase, {
    approver,
    salesInvoiceId,
  }).call();
  res.status(httpStatus.OK).send({ data: salesInvoice });
});

const deleteFormApproveByToken = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    body: { token },
  } = req;

  const { salesInvoice, project } = await new apiServices.DeleteFormApproveByToken(currentTenantDatabase, token).call();
  res.status(httpStatus.OK).send({ data: salesInvoice, meta: { projectName: project.name } });
});

const deleteFormReject = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    user: approver,
    params: { salesInvoiceId },
    body: deleteFormRejectDto,
  } = req;
  const { salesInvoice } = await new apiServices.DeleteFormReject(currentTenantDatabase, {
    approver,
    salesInvoiceId,
    deleteFormRejectDto,
  }).call();
  res.status(httpStatus.OK).send({ data: salesInvoice });
});

const deleteFormRejectByToken = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    body: { token },
  } = req;

  const { salesInvoice, project } = await new apiServices.DeleteFormRejectByToken(currentTenantDatabase, token).call();
  res.status(httpStatus.OK).send({ data: salesInvoice, meta: { projectName: project.name } });
});

const getReport = catchAsync(async (req, res) => {
  const { currentTenantDatabase, query: queries } = req;
  const { salesInvoices, minDate, maxDate } = await new apiServices.GetReport(currentTenantDatabase, queries).call();
  res.status(httpStatus.OK).send({
    data: salesInvoices,
    meta: {
      filter: {
        min_date: minDate,
        max_date: maxDate,
      },
    },
  });
});

const sendInvoiceToCustomer = catchAsync(async (req, res) => {
  const {
    currentTenantDatabase,
    params: { salesInvoiceId },
    body: sendInvoiceToCustomerDto,
  } = req;

  await new apiServices.SendInvoiceToCustomer(currentTenantDatabase, {
    salesInvoiceId,
    sendInvoiceToCustomerDto,
  }).call();

  res.status(httpStatus.OK).send({ message: 'invoice is queued to send to customer' });
});

module.exports = {
  findAll,
  findAllReferenceForm,
  findOne,
  createFormRequest,
  createFormApprove,
  createFormApproveByToken,
  createFormReject,
  createFormRejectByToken,
  updateForm,
  deleteFormRequest,
  deleteFormApprove,
  deleteFormApproveByToken,
  deleteFormReject,
  deleteFormRejectByToken,
  getReport,
  sendInvoiceToCustomer,
};
