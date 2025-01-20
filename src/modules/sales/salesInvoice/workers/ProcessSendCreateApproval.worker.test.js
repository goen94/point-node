const Queue = require('bull');
const factory = require('@root/tests/utils/factory');
const tenantDatabase = require('@src/models').tenant;
const ProcessSendCreateApproval = require('../services/ProcessSendCreateApproval');
const ProcessSendCreateApprovalWorker = require('./ProcessSendCreateApproval.worker');

describe('Process Send Create Approval Worker', () => {
  let salesInvoice;
  beforeEach(async (done) => {
    const recordFactories = await generateRecordFactories();
    ({ salesInvoice } = recordFactories);

    done();
  });

  it('create worker', () => {
    const tenantName = tenantDatabase.sequelize.config.database.replace('point_', '');
    const processSendCreateApproval = jest.spyOn(ProcessSendCreateApproval.prototype, 'call').mockImplementation(() => {});
    const queueProcessSpy = jest.spyOn(Queue.prototype, 'process').mockImplementation((callback) => {
      callback();
    });
    const params = {
      tenantName,
      stockCorrectionId: salesInvoice.id,
    };

    const processSendCreateApprovalWorker = new ProcessSendCreateApprovalWorker(params);
    processSendCreateApprovalWorker.call();
    expect(queueProcessSpy).toHaveBeenCalled();
    expect(processSendCreateApproval).toHaveBeenCalled();
  });
});

const generateRecordFactories = async ({
  maker,
  approver,
  branch,
  branchUser,
  customer,
  warehouse,
  userWarehouse,
  deliveryOrder,
  item,
  itemUnit,
  inventoryForm,
  inventory,
  deliveryNote,
  allocation,
  deliveryNoteItem,
  formDeliveryNote,
  salesInvoice,
  salesInvoiceItem,
  formSalesInvoice,
} = {}) => {
  const chartOfAccountType = await tenantDatabase.ChartOfAccountType.create({
    name: 'cash',
    alias: 'kas',
    isDebit: true,
  });
  const chartOfAccount = await tenantDatabase.ChartOfAccount.create({
    typeId: chartOfAccountType.id,
    position: '',
    name: 'kas besar',
    alias: 'kas besar',
  });

  maker = maker || (await factory.user.create());
  approver = approver || (await factory.user.create());
  branch = branch || (await factory.branch.create());
  // create relation between maker and branch for authorization
  branchUser = branchUser || (await factory.branchUser.create({ user: maker, branch, isDefault: true }));
  customer = customer || (await factory.customer.create({ branch }));
  warehouse = warehouse || (await factory.warehouse.create({ branch }));
  // create relation between maker and warehouse for authorization
  userWarehouse = userWarehouse || (await factory.userWarehouse.create({ user: maker, warehouse, isDefault: true }));
  deliveryOrder = deliveryOrder || (await factory.deliveryOrder.create({ customer, warehouse }));
  item = item || (await factory.item.create({ chartOfAccount }));
  itemUnit = itemUnit || (await factory.itemUnit.create({ item, createdBy: maker.id }));
  inventoryForm =
    inventoryForm ||
    (await factory.form.create({
      branch,
      formable: { id: 0 },
      formableType: 'PurchaseInvoice',
      number: 'PI2109001',
      createdBy: maker.id,
      updatedBy: maker.id,
      requestApprovalTo: approver.id,
    }));
  inventory = inventory || (await factory.inventory.create({ form: inventoryForm, warehouse, item }));
  deliveryNote = deliveryNote || (await factory.deliveryNote.create({ customer, warehouse, deliveryOrder }));
  allocation = allocation || (await factory.allocation.create({ branch }));
  deliveryNoteItem = deliveryNoteItem || (await factory.deliveryNoteItem.create({ deliveryNote, item, allocation }));
  formDeliveryNote =
    formDeliveryNote ||
    (await factory.form.create({
      branch,
      formable: deliveryNote,
      formableType: 'SalesDeliveryNote',
      createdBy: maker.id,
      updatedBy: maker.id,
      requestApprovalTo: approver.id,
    }));
  salesInvoice =
    salesInvoice ||
    (await factory.salesInvoice.create({
      customer,
      referenceable: deliveryNote,
      referenceableType: 'SalesDeliveryNote',
    }));
  salesInvoiceItem =
    salesInvoiceItem ||
    (await factory.salesInvoiceItem.create({
      salesInvoice,
      referenceable: deliveryNote,
      referenceableItem: deliveryNoteItem,
      item,
      allocation,
    }));
  formSalesInvoice =
    formSalesInvoice ||
    (await factory.form.create({
      branch,
      reference: salesInvoice,
      createdBy: maker.id,
      updatedBy: maker.id,
      requestApprovalTo: approver.id,
      formable: salesInvoice,
      formableType: 'SalesInvoice',
      number: 'SI2109001',
    }));

  await tenantDatabase.SettingJournal.create({
    feature: 'sales',
    name: 'account receivable',
    description: 'account receivable',
    chartOfAccountId: chartOfAccount.id,
  });
  await tenantDatabase.SettingJournal.create({
    feature: 'sales',
    name: 'sales income',
    description: 'sales income',
    chartOfAccountId: chartOfAccount.id,
  });
  await tenantDatabase.SettingJournal.create({
    feature: 'sales',
    name: 'income tax payable',
    description: 'income tax payable',
    chartOfAccountId: chartOfAccount.id,
  });
  const settingJournal = await tenantDatabase.SettingJournal.create({
    feature: 'sales',
    name: 'cost of sales',
    description: 'cost of sales',
    chartOfAccountId: chartOfAccount.id,
  });

  return {
    maker,
    approver,
    branch,
    branchUser,
    customer,
    warehouse,
    userWarehouse,
    deliveryOrder,
    item,
    itemUnit,
    inventoryForm,
    inventory,
    deliveryNote,
    allocation,
    deliveryNoteItem,
    formDeliveryNote,
    salesInvoice,
    salesInvoiceItem,
    formSalesInvoice,
    settingJournal,
  };
};
