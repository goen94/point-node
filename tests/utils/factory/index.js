const allocation = require('./allocation');
const branch = require('./branch');
const branchUser = require('./branchUser');
const customer = require('./customer');
const deliveryNote = require('./deliveryNote');
const deliveryNoteItem = require('./deliveryNoteItem');
const deliveryOrder = require('./deliveryOrder');
const form = require('./form');
const inventory = require('./inventory');
const item = require('./item');
const itemUnit = require('./itemUnit');
const payment = require('./payment');
const paymentDetail = require('./paymentDetail');
const permission = require('./permission');
const purchaseDownPayment = require('./purchaseDownPayment');
const purchaseInvoice = require('./purchaseInvoice');
const purchaseReturn = require('./purchaseReturn');
const user = require('./user');
const userWarehouse = require('./userWarehouse');
const warehouse = require('./warehouse');
const salesInvoice = require('./salesInvoice');
const salesInvoiceItem = require('./salesInvoiceItem');
const stockCorrection = require('./stockCorrection');
const stockCorrectionItem = require('./stockCorrectionItem');
const supplier = require('./supplier');
const inventoryAudit = require('./inventoryAudit');
const inventoryAuditItem = require('./inventoryAuditItem');
const salesVisitation = require('./salesVisitation');
const salesVisitationDetail = require('./salesVisitationDetail');

const factory = {
  allocation,
  branch,
  branchUser,
  customer,
  deliveryNote,
  deliveryNoteItem,
  deliveryOrder,
  form,
  inventory,
  item,
  itemUnit,
  payment,
  paymentDetail,
  permission,
  purchaseDownPayment,
  purchaseInvoice,
  purchaseReturn,
  user,
  userWarehouse,
  warehouse,
  salesInvoice,
  salesInvoiceItem,
  stockCorrection,
  stockCorrectionItem,
  supplier,
  inventoryAudit,
  inventoryAuditItem,
  salesVisitation,
  salesVisitationDetail,
};

module.exports = factory;
