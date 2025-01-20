const nodemailer = require('nodemailer');
const htmlToPdf = require('html-pdf-node');
const logger = require('@src/config/logger');
const tenantDatabase = require('@src/models').tenant;
const Mailer = require('@src/utils/Mailer');
const factory = require('@root/tests/utils/factory');
const ProcessSendInvoiceToCustomer = require('./ProcessSendInvoiceToCustomer');

jest.mock('nodemailer');
jest.mock('html-pdf-node');

const sendInvoiceToCustomerDto = {
  email: 'john.doe@mail.com',
  message: 'This is the invoice',
};

describe('Process Send Create Approval', () => {
  let salesInvoice, formSalesInvoice, salesInvoiceItem, item, tenantName, maker, customer;
  beforeEach(async (done) => {
    nodemailer.createTransport.mockReturnValue({
      sendMail: jest.fn().mockReturnValue({ messageId: '1' }),
    });
    htmlToPdf.generatePdf.mockImplementation(() => {});

    tenantName = tenantDatabase.sequelize.config.database.replace('point_', '');
    const recordFactories = await generateRecordFactories();
    ({ salesInvoice, formSalesInvoice, salesInvoiceItem, item, maker, customer } = recordFactories);
    await tenantDatabase.SettingLogo.create({
      path: 'example.png',
      publicUrl: 'https://www.example.com/example.png',
      createdBy: maker.id,
      updatedBy: maker.id,
    });
    await tenantDatabase.SettingEndNote.create({
      salesInvoice: 'end note',
      createdBy: maker.id,
    });

    done();
  });

  it('send mailer', async () => {
    const mailerSpy = jest.spyOn(Mailer.prototype, 'call');
    const loggerInfoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    await new ProcessSendInvoiceToCustomer(tenantName, salesInvoice.id, sendInvoiceToCustomerDto).call();
    expect(mailerSpy).toHaveBeenCalled();
    expect(loggerInfoSpy).toHaveBeenCalled();
  });

  it('send mailer with require production number and expiry date', async () => {
    const mailerSpy = jest.spyOn(Mailer.prototype, 'call');
    const loggerInfoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    await item.update({ requireProductionNumber: true, requireExpiryDate: true });
    await salesInvoiceItem.update({ productionNumber: '001', expiryDate: new Date('2022-03-01') });
    await new ProcessSendInvoiceToCustomer(tenantName, salesInvoice.id, sendInvoiceToCustomerDto).call();
    expect(mailerSpy).toHaveBeenCalled();
    expect(loggerInfoSpy).toHaveBeenCalled();
  });

  it('send mailer with blank message', async () => {
    sendInvoiceToCustomerDto.message = undefined;
    await formSalesInvoice.update({ approvalStatus: 1 });
    const loggerInfoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    await new ProcessSendInvoiceToCustomer(tenantName, salesInvoice.id, sendInvoiceToCustomerDto).call();
    expect(loggerInfoSpy).toHaveBeenCalled();
  });

  it('send mailer with blank customer addres and phone', async () => {
    await customer.update({
      address: null,
      phone: null,
    });
    await formSalesInvoice.update({ approvalStatus: 1 });
    const loggerInfoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    await new ProcessSendInvoiceToCustomer(tenantName, salesInvoice.id, sendInvoiceToCustomerDto).call();
    expect(loggerInfoSpy).toHaveBeenCalled();
  });

  it('calls logger error when mailer failed', async () => {
    nodemailer.createTransport.mockReturnValue({
      sendMail: jest.fn().mockRejectedValue('error'),
    });
    const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    await new ProcessSendInvoiceToCustomer(tenantName, salesInvoice.id, sendInvoiceToCustomerDto).call();
    expect(loggerErrorSpy).toHaveBeenCalled();
  });

  it('send mailer with null referenceable type', async () => {
    await salesInvoice.update({ referenceableType: 'SalesVisitation' });
    const mailerSpy = jest.spyOn(Mailer.prototype, 'call');
    const loggerInfoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    await new ProcessSendInvoiceToCustomer(tenantName, salesInvoice.id, sendInvoiceToCustomerDto).call();
    expect(mailerSpy).toHaveBeenCalled();
    expect(loggerInfoSpy).toHaveBeenCalled();
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
  await tenantDatabase.SettingJournal.create({
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
  };
};
