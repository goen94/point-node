const { Joi } = require('celebrate');

const requireAuth = {
  headers: Joi.object({
    authorization: Joi.string().required(),
  }).unknown(true),
};

const requireId = {
  params: {
    id: Joi.number().required(),
  },
};

const createFormRequest = {
  body: Joi.object({
    paymentType: Joi.string().required(),
    supplierId: Joi.number().required(),
    supplierName: Joi.string().required(),
    invoices: Joi.array().min(1).required().items({
      id: Joi.number().required(),
      amount: Joi.number().min(1).required(),
    }),
    downPayments: Joi.array().items({
      id: Joi.number().required(),
      amount: Joi.number().min(1).required(),
    }),
    returns: Joi.array().items({
      id: Joi.number().required(),
      amount: Joi.number().min(1).required(),
    }),
    others: Joi.array().items({
      coaId: Joi.number().required(),
      notes: Joi.string().allow(null).default(''),
      amount: Joi.number().min(1).required(),
      allocationId: Joi.number().allow(null),
    }),
    date: Joi.date().iso().required(),
    requestApprovalTo: Joi.number().required(),
    totalInvoiceAmount: Joi.number().required(),
    totalDownPaymentAmount: Joi.number().required(),
    totalReturnAmount: Joi.number().required(),
    totalOtherAmount: Joi.number().required(),
    totalAmount: Joi.number().required(),
    notes: Joi.string().trim(true).allow(null).default('').max(255),
  }),
};

const updateFormRequest = {
  body: Joi.object({
    paymentType: Joi.string().required(),
    supplierId: Joi.number().required(),
    supplierName: Joi.string().required(),
    invoices: Joi.array().min(1).required().items({
      id: Joi.number().required(),
      amount: Joi.number().min(1).required(),
    }),
    downPayments: Joi.array().items({
      id: Joi.number().required(),
      amount: Joi.number().min(1).required(),
    }),
    returns: Joi.array().items({
      id: Joi.number().required(),
      amount: Joi.number().min(1).required(),
    }),
    others: Joi.array().items({
      coaId: Joi.number().required(),
      notes: Joi.string().allow(null).default(''),
      amount: Joi.number().min(1).required(),
      allocationId: Joi.number().allow(null),
    }),
    date: Joi.date().iso().required(),
    requestApprovalTo: Joi.number().required(),
    totalInvoiceAmount: Joi.number().required(),
    totalDownPaymentAmount: Joi.number().required(),
    totalReturnAmount: Joi.number().required(),
    totalOtherAmount: Joi.number().required(),
    totalAmount: Joi.number().required(),
    notes: Joi.string().trim(true).allow(null).default('').max(255),
  }),
};

const createFormReject = {
  body: Joi.object({
    reason: Joi.string().required().max(255).min(1),
  }),
};

const deleteFormRequest = {
  body: Joi.object({
    reason: Joi.string().required().max(255).min(1),
  }),
};

const deleteFormReject = {
  body: Joi.object({
    reason: Joi.string().required().max(255).min(1),
  }),
};

module.exports = {
  requireAuth,
  requireId,
  createFormRequest,
  updateFormRequest,
  deleteFormRequest,
  deleteFormReject,
  createFormReject
};
