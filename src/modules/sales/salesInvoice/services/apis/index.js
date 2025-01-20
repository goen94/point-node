const CreateFormApprove = require('./CreateFormApprove');
const CreateFormApproveByToken = require('./CreateFormApproveByToken');
const CreateFormReject = require('./CreateFormReject');
const CreateFormRejectByToken = require('./CreateFormRejectByToken');
const CreateFormRequest = require('./CreateFormRequest');
const DeleteFormApprove = require('./DeleteFormApprove');
const DeleteFormApproveByToken = require('./DeleteFormApproveByToken');
const DeleteFormReject = require('./DeleteFormReject');
const DeleteFormRejectByToken = require('./DeleteFormRejectByToken');
const DeleteFormRequest = require('./DeleteFormRequest');
const FindAll = require('./FindAll');
const FindAllReferenceForm = require('./FindAllReferenceForm');
const FindOne = require('./FindOne');
const GetReport = require('./GetReport');
const SendInvoiceToCustomer = require('./SendInvoiceToCustomer');
const UpdateForm = require('./UpdateForm');

module.exports = {
  CreateFormRequest,
  CreateFormApprove,
  CreateFormApproveByToken,
  CreateFormReject,
  CreateFormRejectByToken,
  DeleteFormApprove,
  DeleteFormApproveByToken,
  DeleteFormReject,
  DeleteFormRejectByToken,
  DeleteFormRequest,
  FindAll,
  FindAllReferenceForm,
  FindOne,
  GetReport,
  SendInvoiceToCustomer,
  UpdateForm,
};
