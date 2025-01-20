const { Joi } = require('celebrate');

const updateSettingendNote = {
  body: Joi.object({
    purchaseRequest: Joi.string().allow(null).allow(''),
    purchaseOrder: Joi.string().allow(null).allow(''),
    purchaseDownPayment: Joi.string().allow(null).allow(''),
    purchaseReceive: Joi.string().allow(null).allow(''),
    purchaseInvoice: Joi.string().allow(null).allow(''),
    purchaseReturn: Joi.string().allow(null).allow(''),
    paymentOrderPurchase: Joi.string().allow(null).allow(''),
    pointOfSales: Joi.string().allow(null).allow(''),
    salesQuotation: Joi.string().allow(null).allow(''),
    salesOrder: Joi.string().allow(null).allow(''),
    salesDownPayment: Joi.string().allow(null).allow(''),
    salesInvoice: Joi.string().allow(null).allow(''),
    salesReturn: Joi.string().allow(null).allow(''),
    paymentCollectionSales: Joi.string().allow(null).allow(''),
    expeditionOrder: Joi.string().allow(null).allow(''),
    expeditionDownPayment: Joi.string().allow(null).allow(''),
    expeditionInvoice: Joi.string().allow(null).allow(''),
    paymentOrderExpedition: Joi.string().allow(null).allow(''),
  }),
};

module.exports = {
  updateSettingendNote,
};
