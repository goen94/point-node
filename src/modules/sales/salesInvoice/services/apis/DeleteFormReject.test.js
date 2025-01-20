const httpStatus = require('http-status');
const { User, Role, ModelHasRole } = require('@src/models').tenant;
const ApiError = require('@src/utils/ApiError');
const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const DeleteFormReject = require('./DeleteFormReject');

describe('Sales Invoice - DeleteFormReject', () => {
  describe('validations', () => {
    it('throw error when sales invoice is not exist', async () => {
      const approver = await factory.user.create();

      await expect(async () => {
        await new DeleteFormReject(tenantDatabase, { approver, salesInvoiceId: 'invalid-id' }).call();
      }).rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'Sales invoice is not exist'));
    });

    it('throw error when rejected by unwanted user', async () => {
      const hacker = await factory.user.create();
      const { salesInvoice, formSalesInvoice, approver } = await generateRecordFactories();
      await formSalesInvoice.update({ cancellationStatus: 0, requestCancellationTo: approver.id });
      const deleteFormRejectDto = {
        reason: 'example reason',
      };

      await expect(async () => {
        await new DeleteFormReject(tenantDatabase, {
          approver: hacker,
          salesInvoiceId: salesInvoice.id,
          deleteFormRejectDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'Forbidden - You are not the selected approver'));
    });

    it('throw error when sales invoice not requested to be delete', async () => {
      const { salesInvoice, formSalesInvoice, approver } = await generateRecordFactories();
      const deleteFormRejectDto = {
        reason: 'example reason',
      };

      expect(formSalesInvoice.cancellationStatus).toBeUndefined();
      await expect(async () => {
        await new DeleteFormReject(tenantDatabase, {
          approver,
          salesInvoiceId: salesInvoice.id,
          deleteFormRejectDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Sales invoice is not requested to be delete'));
    });
  });

  describe('success reject', () => {
    let salesInvoice, approver, formSalesInvoice, deleteFormRejectDto;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      ({ salesInvoice, approver, formSalesInvoice } = recordFactories);

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
      await formSalesInvoice.update({ cancellationStatus: 0, requestCancellationTo: approver.id });
      deleteFormRejectDto = {
        reason: 'example reason',
      };

      done();
    });

    it('update form cancellation status to rejected', async () => {
      ({ salesInvoice } = await new DeleteFormReject(tenantDatabase, {
        approver,
        salesInvoiceId: salesInvoice.id,
        deleteFormRejectDto,
      }).call());

      expect(salesInvoice.form.cancellationStatus).toEqual(-1);
    });

    it('can be reject by super admin', async () => {
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
      ({ salesInvoice } = await new DeleteFormReject(tenantDatabase, {
        approver,
        salesInvoiceId: salesInvoice.id,
        deleteFormRejectDto,
      }).call());

      await formSalesInvoice.reload();
      expect(formSalesInvoice.cancellationStatus).toEqual(-1);
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
  item = item || (await factory.item.create());
  itemUnit = itemUnit || (await factory.itemUnit.create({ item, createdBy: maker.id }));
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
