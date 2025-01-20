const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const FindOne = require('./FindOne');

describe('Sales Invoice - FindOne', () => {
  describe('success', () => {
    let salesInvoice, formSalesInvoice;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      ({ salesInvoice, formSalesInvoice } = recordFactories);

      done();
    });

    it('return expected sales invoices', async () => {
      const { salesInvoice: foundSalesInvoice } = await new FindOne(tenantDatabase, salesInvoice.id).call();

      expect(foundSalesInvoice).toBeDefined();
      expect(foundSalesInvoice.id).toBe(salesInvoice.id);
      expect(foundSalesInvoice.form.number).toBe(formSalesInvoice.number);
    });
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
  deliveryNote,
  allocation,
  deliveryNoteItem,
  formDeliveryNote,
  salesInvoice,
  formSalesInvoice,
} = {}) => {
  maker = await factory.user.create(maker);
  approver = await factory.user.create(approver);
  branch = await factory.branch.create(branch);
  // create relation between maker and branch for authorization
  branchUser = await factory.branchUser.create({ user: maker, branch, isDefault: true });
  customer = await factory.customer.create({ branch, ...customer });
  warehouse = await factory.warehouse.create({ branch, ...warehouse });
  // create relation between maker and warehouse for authorization
  userWarehouse = await factory.userWarehouse.create({ user: maker, warehouse, isDefault: true, ...userWarehouse });
  deliveryOrder = await factory.deliveryOrder.create({ customer, warehouse, ...deliveryOrder });
  item = await factory.item.create();
  itemUnit = await factory.itemUnit.create({ item, createdBy: maker.id, ...itemUnit });
  deliveryNote = await factory.deliveryNote.create({ customer, warehouse, deliveryOrder, ...deliveryNote });
  allocation = await factory.allocation.create({ branch, ...allocation });
  deliveryNoteItem = await factory.deliveryNoteItem.create({ deliveryNote, item, allocation, ...deliveryNoteItem });
  formDeliveryNote = await factory.form.create({
    branch,
    formable: deliveryNote,
    formableType: 'SalesDeliveryNote',
    createdBy: maker.id,
    updatedBy: maker.id,
    requestApprovalTo: approver.id,
    ...formDeliveryNote,
  });
  salesInvoice = await factory.salesInvoice.create({
    customer,
    referenceable: deliveryNote,
    referenceableType: 'SalesDeliveryNote',
    ...salesInvoice,
  });
  formSalesInvoice = await factory.form.create({
    branch,
    reference: salesInvoice,
    createdBy: maker.id,
    updatedBy: maker.id,
    requestApprovalTo: approver.id,
    formable: salesInvoice,
    formableType: 'SalesInvoice',
    number: 'SI2109001',
    ...formSalesInvoice,
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
    deliveryNote,
    allocation,
    deliveryNoteItem,
    formDeliveryNote,
    salesInvoice,
    formSalesInvoice,
  };
};
