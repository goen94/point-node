const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const FindAll = require('./FindAll');

describe('Sales Invoice - FindAll', () => {
  describe('success', () => {
    let salesInvoice, formSalesInvoice, customer;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      ({ salesInvoice, formSalesInvoice, customer } = recordFactories);

      done();
    });

    it('return expected sales invoices', async () => {
      const { salesInvoices } = await new FindAll(tenantDatabase).call();

      expect(salesInvoices.length).toBe(1);
      expect(salesInvoices[0].id).toBe(salesInvoice.id);
      expect(salesInvoices[0].form.number).toBe(formSalesInvoice.number);
    });

    it('return expected sales invoices with single like query', async () => {
      const queries = {
        filter_like: JSON.stringify({
          'form.number': 'SI',
        }),
      };
      const { salesInvoices } = await new FindAll(tenantDatabase, queries).call();

      expect(salesInvoices.length).toBe(1);
      expect(salesInvoices[0].id).toBe(salesInvoice.id);
      expect(salesInvoices[0].form.number).toBe(formSalesInvoice.number);
    });

    it('return expected sales invoices with multiple query', async () => {
      let queries = {
        filter_like: JSON.stringify({
          referenceableType: null,
          customerName: customer.name,
          'form.number': 'SI',
        }),
        filter_date_min: new Date(),
        filter_date_max: new Date(),
        filter_form: 'pending;approvalPending',
      };
      let { salesInvoices } = await new FindAll(tenantDatabase, queries).call();

      expect(salesInvoices.length).toBe(1);
      expect(salesInvoices[0].id).toBe(salesInvoice.id);
      expect(salesInvoices[0].form.number).toBe(formSalesInvoice.number);

      queries = {
        filter_like: JSON.stringify({
          referenceableType: null,
          customerName: customer.name,
          'form.number': 'SI',
        }),
        filter_date_min: new Date(),
        filter_date_max: new Date(),
        filter_form: 'cancellationApproved;approvalPending',
      };
      ({ salesInvoices } = await new FindAll(tenantDatabase, queries).call());

      expect(salesInvoices.length).toBe(0);

      queries = {
        filter_like: JSON.stringify({
          referenceableType: null,
          customerName: customer.name,
          'form.number': 'SI',
        }),
        filter_date_min: new Date(),
        filter_date_max: new Date(),
        filter_form: 'null;null',
        limit: 5,
        page: 1,
      };
      ({ salesInvoices } = await new FindAll(tenantDatabase, queries).call());

      expect(salesInvoices.length).toBe(1);

      queries = {
        limit: 5,
        page: 2,
      };
      ({ salesInvoices } = await new FindAll(tenantDatabase, queries).call());

      expect(salesInvoices.length).toBe(0);
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
