const httpStatus = require('http-status');
const moment = require('moment');
const ApiError = require('@src/utils/ApiError');
const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const logger = require('@src/config/logger');
const tokenService = require('@src/modules/auth/services/token.service');
const DeleteFormApprove = require('./DeleteFormApprove');
const DeleteFormApproveByToken = require('./DeleteFormApproveByToken');

describe('Sales Invoice - DeleteFormApproveByToken', () => {
  describe('validations', () => {
    it('throw error when token is invalid', async () => {
      await expect(async () => {
        await new DeleteFormApproveByToken(tenantDatabase, 'invalid-token').call();
      }).rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'invalid token'));
    });

    it('throw error when sales invoice is already rejected', async () => {
      const { approver, salesInvoice, formSalesInvoice } = await generateRecordFactories();
      await formSalesInvoice.update({
        cancellationStatus: -1,
      });
      const token = await createToken(salesInvoice, approver);

      await expect(async () => {
        await new DeleteFormApproveByToken(tenantDatabase, token).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Sales invoice is not requested to be delete'));
    });
  });

  describe('success approve', () => {
    let salesInvoice, approver;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      ({ salesInvoice, approver } = recordFactories);

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
      await tenantDatabase.SettingJournal.create({
        feature: 'sales',
        name: 'cost of sales',
        description: 'cost of sales',
        chartOfAccountId: chartOfAccount.id,
      });

      const token = await createToken(salesInvoice, approver);

      ({ salesInvoice } = await new DeleteFormApproveByToken(tenantDatabase, token).call());

      done();
    });

    it('update form status to approved', async () => {
      expect(salesInvoice.form.cancellationStatus).toEqual(1);
    });
  });

  describe('failed', () => {
    let salesInvoice, token;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      const { approver } = recordFactories;
      ({ salesInvoice } = recordFactories);

      token = await createToken(salesInvoice, approver);

      done();
    });

    it('throws error when token payload undefined', async () => {
      jest.spyOn(tokenService, 'verifyToken').mockReturnValue();
      await expect(async () => {
        await new DeleteFormApproveByToken(tenantDatabase, token).call();
      }).rejects.toThrow('Forbidden');
      tokenService.verifyToken.mockRestore();
    });

    it('call logger error when get unexpected error', async () => {
      const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
      jest.spyOn(DeleteFormApprove.prototype, 'call').mockRejectedValue('error');
      await new DeleteFormApproveByToken(tenantDatabase, token).call();
      expect(loggerErrorSpy).toHaveBeenCalled();
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
      cancellationStatus: 0,
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

const createToken = async (salesInvoice, approver) => {
  const payload = {
    salesInvoiceId: salesInvoice.id,
    userId: approver.id,
  };
  const expires = moment().add(7, 'days');

  const token = await tokenService.generatePayloadToken(payload, expires);

  return token;
};
