const httpStatus = require('http-status');
const { User, Role, ModelHasRole } = require('@src/models').tenant;
const ApiError = require('@src/utils/ApiError');
const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const ProcessSendDeleteApproval = require('../../workers/ProcessSendDeleteApproval.worker');
const DeleteFormRequest = require('./DeleteFormRequest');

jest.mock('../../workers/ProcessSendDeleteApproval.worker');
beforeEach(() => {
  ProcessSendDeleteApproval.mockClear();
});

describe('Sales Invoice - DeleteFormRequest', () => {
  describe('validations', () => {
    it('throw error when sales invoice is not exist', async () => {
      const maker = await factory.user.create();
      const deleteFormRequestDto = {
        reason: 'example reason',
      };

      await expect(async () => {
        await new DeleteFormRequest(tenantDatabase, { maker, salesInvoiceId: 'invalid-id', deleteFormRequestDto }).call();
      }).rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'Sales invoice is not exist'));
    });

    it('throw error when requested by unwanted user', async () => {
      const hacker = await factory.user.create();
      const { salesInvoice } = await generateRecordFactories();
      const deleteFormRequestDto = {
        reason: 'example reason',
      };

      await expect(async () => {
        await new DeleteFormRequest(tenantDatabase, {
          maker: hacker,
          salesInvoiceId: salesInvoice.id,
          deleteFormRequestDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'Forbidden - Only maker can delete the invoice'));
    });

    it('throw error when sales invoice is already done', async () => {
      const { maker, salesInvoice, formSalesInvoice } = await generateRecordFactories();
      await formSalesInvoice.update({ done: true });
      const deleteFormRequestDto = {
        reason: 'example reason',
      };

      await expect(async () => {
        await new DeleteFormRequest(tenantDatabase, { maker, salesInvoiceId: salesInvoice.id, deleteFormRequestDto }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Can not delete already referenced sales invoice'));
    });
  });

  describe('success request', () => {
    let salesInvoice, maker, deleteFormRequestDto;
    beforeEach(async (done) => {
      ({ salesInvoice, maker } = await generateRecordFactories());

      deleteFormRequestDto = {
        reason: 'example reason',
      };

      done();
    });

    it('update form cancellation status to pending', async () => {
      ({ salesInvoice } = await new DeleteFormRequest(tenantDatabase, {
        maker,
        salesInvoiceId: salesInvoice.id,
        deleteFormRequestDto,
      }).call());

      expect(salesInvoice.form.cancellationStatus).toEqual(0);
    });

    it('can be request by super admin', async () => {
      const superAdmin = await factory.user.create();
      const superAdminRole = await Role.create({ name: 'super admin', guardName: 'api' });
      await ModelHasRole.create({
        roleId: superAdminRole.id,
        modelId: superAdmin.id,
        modelType: 'App\\Model\\Master\\User',
      });
      maker = await User.findOne({
        where: { id: superAdmin.id },
        include: [{ model: ModelHasRole, as: 'modelHasRole', include: [{ model: Role, as: 'role' }] }],
      });
      ({ salesInvoice } = await new DeleteFormRequest(tenantDatabase, {
        maker,
        salesInvoiceId: salesInvoice.id,
        deleteFormRequestDto,
      }).call());
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
