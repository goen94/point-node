const httpStatus = require('http-status');
const { User, Role, ModelHasRole, Inventory } = require('@src/models').tenant;
const ApiError = require('@src/utils/ApiError');
const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const CreateFormApprove = require('./CreateFormApprove');

describe('Stock Correction - Create Form Approve', () => {
  describe('validations', () => {
    it('throw error when stock correction is not exist', async () => {
      const approver = await factory.user.create();

      await expect(async () => {
        await new CreateFormApprove(tenantDatabase, { approver, stockCorrectionId: 'invalid-id' }).call();
      }).rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'Stock correction is not exist'));
    });

    it('throw error when approved by unwanted user', async () => {
      const hacker = await factory.user.create();
      const { stockCorrection } = await generateRecordFactories();

      await expect(async () => {
        await new CreateFormApprove(tenantDatabase, { approver: hacker, stockCorrectionId: stockCorrection.id }).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    });

    it('throw error when stock correction is already rejected', async () => {
      const { approver, stockCorrection, stockCorrectionForm } = await generateRecordFactories();
      await stockCorrectionForm.update({
        approvalStatus: -1,
      });

      await expect(async () => {
        await new CreateFormApprove(tenantDatabase, { approver, stockCorrectionId: stockCorrection.id }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Stock correction already rejected'));
    });

    it('return approved stock correction when stock correction is already approved', async () => {
      const { approver, stockCorrection, stockCorrectionForm } = await generateRecordFactories();
      await stockCorrectionForm.update({
        approvalStatus: 1,
      });

      const createFormApprove = await new CreateFormApprove(tenantDatabase, {
        approver,
        stockCorrectionId: stockCorrection.id,
      }).call();

      expect(createFormApprove.stockCorrection).toBeDefined();
      expect(createFormApprove.stockCorrection.form.approvalStatus).toEqual(1);
    });
  });

  describe('success', () => {
    let stockCorrection, stockCorrectionItem, stockCorrectionForm, approver;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      ({ stockCorrection, stockCorrectionItem, stockCorrectionForm, approver } = recordFactories);

      done();
    });

    it('change form status to approved', async () => {
      ({ stockCorrection } = await new CreateFormApprove(tenantDatabase, {
        approver,
        stockCorrectionId: stockCorrection.id,
      }).call());

      await stockCorrectionForm.reload();
      expect(stockCorrectionForm.approvalStatus).toEqual(1);
    });

    it('create the journals', async () => {
      ({ stockCorrection } = await new CreateFormApprove(tenantDatabase, {
        approver,
        stockCorrectionId: stockCorrection.id,
      }).call());

      const journals = await tenantDatabase.Journal.findAll({ where: { formId: stockCorrectionForm.id } });
      expect(journals.length).toEqual(2);
    });

    it('create the inventory', async () => {
      let totalInventory = await Inventory.count();
      expect(totalInventory).toEqual(1);
      ({ stockCorrection } = await new CreateFormApprove(tenantDatabase, {
        approver,
        stockCorrectionId: stockCorrection.id,
      }).call());
      const inventories = await tenantDatabase.Inventory.findAll({ where: { formId: stockCorrectionForm.id } });
      expect(inventories.length).toEqual(1);
      totalInventory = await Inventory.count();
      expect(totalInventory).toEqual(2);
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
      ({ stockCorrection } = await new CreateFormApprove(tenantDatabase, {
        approver,
        stockCorrectionId: stockCorrection.id,
      }).call());
    });

    it('can stock correction with minus quantity', async () => {
      await stockCorrectionItem.update({ quantity: -10 });
      ({ stockCorrection } = await new CreateFormApprove(tenantDatabase, {
        approver,
        stockCorrectionId: stockCorrection.id,
      }).call());

      const journals = await tenantDatabase.Journal.findAll({ where: { formId: stockCorrectionForm.id } });
      expect(journals.length).toEqual(2);
    });

    it('not create inventory when quantity 0', async () => {
      let totalInventory = await Inventory.count();
      expect(totalInventory).toEqual(1);
      await stockCorrectionItem.update({ quantity: 0 });
      ({ stockCorrection } = await new CreateFormApprove(tenantDatabase, {
        approver,
        stockCorrectionId: stockCorrection.id,
      }).call());
      totalInventory = await Inventory.count();
      expect(totalInventory).toEqual(1);
    });
  });

  describe('failed', () => {
    let stockCorrection, stockCorrectionItem, approver, settingJournal;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      ({ stockCorrection, stockCorrectionItem, approver, settingJournal } = recordFactories);

      done();
    });

    it('throws error when stock become minus', async () => {
      await stockCorrectionItem.update({ quantity: -110 });
      await expect(async () => {
        await new CreateFormApprove(tenantDatabase, {
          approver,
          stockCorrectionId: stockCorrection.id,
        }).call();
      }).rejects.toThrow('Stock can not be minus');
    });

    it('throws error setting journal not exist', async () => {
      await settingJournal.destroy();
      await expect(async () => {
        await new CreateFormApprove(tenantDatabase, {
          approver,
          stockCorrectionId: stockCorrection.id,
        }).call();
      }).rejects.toThrow('Journal stock correction account - difference stock expenses not found');
    });
  });
});

const generateRecordFactories = async ({
  maker,
  approver,
  branch,
  warehouse,
  item,
  stockCorrection,
  stockCorrectionItem,
  stockCorrectionForm,
} = {}) => {
  const chartOfAccountType = await tenantDatabase.ChartOfAccountType.create({
    name: 'cost of sales',
    alias: 'beban pokok penjualan',
    isDebit: true,
  });
  const chartOfAccount = await tenantDatabase.ChartOfAccount.create({
    typeId: chartOfAccountType.id,
    position: 'DEBIT',
    name: 'beban selisih persediaan',
    alias: 'beban selisih persediaan',
  });

  maker = await factory.user.create(maker);
  approver = await factory.user.create(approver);
  branch = await factory.branch.create(branch);
  warehouse = await factory.warehouse.create({ branch, ...warehouse });
  item = await factory.item.create({ chartOfAccount, ...item });
  stockCorrection = await factory.stockCorrection.create({ warehouse, ...stockCorrection });
  stockCorrectionItem = await factory.stockCorrectionItem.create({
    stockCorrection,
    quantity: 10,
    item,
  });
  stockCorrectionForm = await factory.form.create({
    branch,
    createdBy: maker.id,
    updatedBy: maker.id,
    requestApprovalTo: approver.id,
    formable: stockCorrection,
    formableType: 'StockCorrection',
    number: 'SC2101001',
  });

  const settingJournal = await tenantDatabase.SettingJournal.create({
    feature: 'stock correction',
    name: 'difference stock expenses',
    description: 'difference stock expenses',
    chartOfAccountId: chartOfAccount.id,
  });

  const inventoryForm = await factory.form.create({
    date: new Date('2022-01-01'),
    branch,
    number: 'PI2101001',
    formable: { id: 1 },
    formableType: 'PurchaseInvoice',
    createdBy: maker.id,
    updatedBy: maker.id,
  });
  await factory.inventory.create({
    form: inventoryForm,
    warehouse,
    item,
  });

  return {
    maker,
    approver,
    branch,
    warehouse,
    item,
    stockCorrection,
    stockCorrectionItem,
    stockCorrectionForm,
    settingJournal,
  };
};
