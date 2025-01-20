const httpStatus = require('http-status');
const tenantDatabase = require('@src/models').tenant;
const ApiError = require('@src/utils/ApiError');
const factory = require('@root/tests/utils/factory');
const CreateFormApprove = require('./CreateFormApprove');

const { User, Role, ModelHasRole, Inventory } = tenantDatabase;

describe('Sales Invoice - CreateFormApprove', () => {
  describe('validations', () => {
    it('throw error when sales invoice is not exist', async () => {
      const approver = await factory.user.create();

      await expect(async () => {
        await new CreateFormApprove(tenantDatabase, { approver, salesInvoiceId: 'invalid-id' }).call();
      }).rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'Sales invoice is not exist'));
    });

    it('throw error when approved by unwanted user', async () => {
      const hacker = await factory.user.create();
      const { salesInvoice } = await generateRecordFactories();

      await expect(async () => {
        await new CreateFormApprove(tenantDatabase, { approver: hacker, salesInvoiceId: salesInvoice.id }).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'Forbidden - You are not the selected approver'));
    });

    it('throw error when sales invoice is already rejected', async () => {
      const { approver, salesInvoice, formSalesInvoice } = await generateRecordFactories();
      await formSalesInvoice.update({
        approvalStatus: -1,
      });

      await expect(async () => {
        await new CreateFormApprove(tenantDatabase, { approver, salesInvoiceId: salesInvoice.id }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Sales invoice already rejected'));
    });

    it('return approved sales invoice when sales invoice is already approved', async () => {
      const { approver, salesInvoice, formSalesInvoice } = await generateRecordFactories();
      await formSalesInvoice.update({
        approvalStatus: 1,
      });

      const createFormApprove = await new CreateFormApprove(tenantDatabase, {
        approver,
        salesInvoiceId: salesInvoice.id,
      }).call();

      expect(createFormApprove.salesInvoice).toBeDefined();
      expect(createFormApprove.salesInvoice.form.approvalStatus).toEqual(1);
    });
  });

  describe('success approve', () => {
    let salesInvoice, approver, formSalesInvoice, salesInvoiceItem;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      ({ salesInvoice, approver, formSalesInvoice, salesInvoiceItem } = recordFactories);

      done();
    });

    it('update form status to approved', async () => {
      ({ salesInvoice } = await new CreateFormApprove(tenantDatabase, {
        approver,
        salesInvoiceId: salesInvoice.id,
      }).call());

      await formSalesInvoice.reload();
      expect(formSalesInvoice.approvalStatus).toEqual(1);
    });

    it('create the journals', async () => {
      ({ salesInvoice } = await new CreateFormApprove(tenantDatabase, {
        approver,
        salesInvoiceId: salesInvoice.id,
      }).call());

      const journals = await tenantDatabase.Journal.findAll({ where: { formId: formSalesInvoice.id } });
      await formSalesInvoice.reload();
      expect(journals.length).toEqual(5);
    });

    it('can be approve by super admin', async () => {
      const superAdmin = await factory.user.create();
      const superAdminRole = await Role.create({ name: 'super admin', guardName: 'api' });
      await ModelHasRole.create({
        roleId: superAdminRole.id,
        modelId: superAdmin.id,
        modelType: 'App\\Model\\Master\\User',
      });
      approver = await User.findOne({
        where: { id: superAdmin.id },
        include: [{ model: ModelHasRole, as: 'modelHasRole', include: [{ model: Role, as: 'role' }] }],
      });
      ({ salesInvoice } = await new CreateFormApprove(tenantDatabase, {
        approver,
        salesInvoiceId: salesInvoice.id,
      }).call());
    });

    it('not create inventory when quantity 0', async () => {
      let totalInventory = await Inventory.count();
      expect(totalInventory).toEqual(1);
      await salesInvoiceItem.update({ quantity: 0 });
      ({ salesInvoice } = await new CreateFormApprove(tenantDatabase, {
        approver,
        salesInvoiceId: salesInvoice.id,
      }).call());
      totalInventory = await Inventory.count();
      expect(totalInventory).toEqual(1);
    });
  });

  describe('failed', () => {
    let salesInvoice, approver, settingJournal;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      ({ salesInvoice, approver, settingJournal } = recordFactories);

      done();
    });

    it('throws error when setting journal is missing', async () => {
      await settingJournal.destroy();
      await expect(async () => {
        await new CreateFormApprove(tenantDatabase, {
          approver,
          salesInvoiceId: salesInvoice.id,
        }).call();
      }).rejects.toThrow('Journal sales account - cost of sales not found');
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
