const { Joi } = require('celebrate');

const requireAuth = {
  headers: Joi.object({
    authorization: Joi.string().required(),
  }).unknown(true),
};

const requireSalesInvoiceId = {
  params: {
    salesInvoiceId: Joi.number().required(),
  },
};

const createFormRequest = {
  body: Joi.object({
    formId: Joi.number().required(),
    items: Joi.array().items({
      itemId: Joi.number().required(),
      referenceItemId: Joi.number().required(),
      quantity: Joi.number().min(0).required(),
      itemUnit: Joi.string().required(),
      converter: Joi.number().required(),
      allocationId: Joi.number().allow(null),
      price: Joi.number().required(),
      discountPercent: Joi.number().min(0).max(100).default(0),
      discountValue: Joi.number().min(0).default(0),
      expiryDate: Joi.date().iso().allow(null),
      productionNumber: Joi.string().allow(null),
    }),
    requestApprovalTo: Joi.number().required(),
    dueDate: Joi.date().iso().required(),
    discountPercent: Joi.number().min(0).max(100).default(0),
    discountValue: Joi.number().min(0).default(0),
    customerId: Joi.number().required(),
    typeOfTax: Joi.string().valid('include', 'exclude', 'non').required(),
    notes: Joi.string().allow(null).default(''),
  }),
};

const createFormReject = {
  body: Joi.object({
    reason: Joi.string().allow(null).default(''),
  }),
};

const deleteFormRequest = {
  body: Joi.object({
    reason: Joi.string().allow(null).default(''),
  }),
};

const deleteFormReject = {
  body: Joi.object({
    reason: Joi.string().allow(null).default(''),
  }),
};

const updateForm = {
  body: Joi.object({
    id: Joi.number().required(),
    items: Joi.array().items({
      salesInvoiceItemId: Joi.number().required(),
      allocationId: Joi.number().allow(null),
      discountPercent: Joi.number().min(0).max(100).default(0),
      discountValue: Joi.number().min(0).default(0),
      price: Joi.number().required(),
    }),
    requestApprovalTo: Joi.number().required(),
    dueDate: Joi.date().iso().required(),
    discountPercent: Joi.number().min(0).max(100).default(0),
    discountValue: Joi.number().min(0).default(0),
    typeOfTax: Joi.string().valid('include', 'exclude', 'non').required(),
    notes: Joi.string().allow(null).default(''),
  }),
};

const createFormApproveByToken = {
  body: Joi.object({
    token: Joi.string().required(),
  }),
};

const createFormRejectByToken = {
  body: Joi.object({
    token: Joi.string().required(),
  }),
};

const deleteFormApproveByToken = {
  body: Joi.object({
    token: Joi.string().required(),
  }),
};

const deleteFormRejectByToken = {
  body: Joi.object({
    token: Joi.string().required(),
  }),
};

const sendInvoice = {
  body: Joi.object({
    email: Joi.string().email().required(),
    message: Joi.string().allow(null, ''),
  }),
};

module.exports = {
  requireAuth,
  createFormRequest,
  requireSalesInvoiceId,
  createFormReject,
  deleteFormRequest,
  deleteFormReject,
  updateForm,
  createFormApproveByToken,
  createFormRejectByToken,
  deleteFormApproveByToken,
  deleteFormRejectByToken,
  sendInvoice,
};
