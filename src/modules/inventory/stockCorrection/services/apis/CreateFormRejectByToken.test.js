const httpStatus = require('http-status');
const moment = require('moment');
const logger = require('@src/config/logger');
const ApiError = require('@src/utils/ApiError');
const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const tokenService = require('@src/modules/auth/services/token.service');
const CreateFormReject = require('./CreateFormReject');
const CreateFormRejectByToken = require('./CreateFormRejectByToken');

describe('Stock Correction - Create Form Reject By Token', () => {
  describe('validations', () => {
    it('throw error when token is invalid', async () => {
      await expect(async () => {
        await new CreateFormRejectByToken(tenantDatabase, 'invalid-token').call();
      }).rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'invalid token'));
    });

    it('throw error when stock correction is already approved', async () => {
      const { approver, stockCorrection, stockCorrectionForm } = await generateRecordFactories();
      await stockCorrectionForm.update({
        approvalStatus: 1,
      });
      const token = await createToken(stockCorrection, approver);

      await expect(async () => {
        await new CreateFormRejectByToken(tenantDatabase, token).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Stock correction already approved'));
    });

    it('return rejected stock correction when stock correction is already rejected', async () => {
      const { approver, stockCorrection, stockCorrectionForm } = await generateRecordFactories();
      await stockCorrectionForm.update({
        approvalStatus: -1,
      });
      const token = await createToken(stockCorrection, approver);

      const createFormApprove = await new CreateFormRejectByToken(tenantDatabase, token).call();

      expect(createFormApprove.stockCorrection).toBeDefined();
      expect(createFormApprove.stockCorrection.form.approvalStatus).toEqual(-1);
    });
  });

  describe('success', () => {
    let stockCorrection, stockCorrectionForm;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      const { approver } = recordFactories;
      ({ stockCorrection, stockCorrectionForm } = recordFactories);

      const token = await createToken(stockCorrection, approver);

      ({ stockCorrection } = await new CreateFormRejectByToken(tenantDatabase, token).call());

      done();
    });

    it('update form status to rejected', async () => {
      await stockCorrectionForm.reload();
      expect(stockCorrectionForm.approvalStatus).toEqual(-1);
    });
  });

  describe('failed', () => {
    let stockCorrection, token;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      const { approver } = recordFactories;
      ({ stockCorrection } = recordFactories);

      token = await createToken(stockCorrection, approver);

      done();
    });

    it('throws error when token payload undefined', async () => {
      jest.spyOn(tokenService, 'verifyToken').mockReturnValue();
      await expect(async () => {
        await new CreateFormRejectByToken(tenantDatabase, token).call();
      }).rejects.toThrow('Forbidden');
      tokenService.verifyToken.mockRestore();
    });

    it('call logger error when get unexpected error', async () => {
      const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
      jest.spyOn(CreateFormReject.prototype, 'call').mockRejectedValue('error');
      await new CreateFormRejectByToken(tenantDatabase, token).call();
      expect(loggerErrorSpy).toHaveBeenCalled();
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

  await tenantDatabase.SettingJournal.create({
    feature: 'stock correction',
    name: 'difference stock expenses',
    description: 'difference stock expenses',
    chartOfAccountId: chartOfAccount.id,
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
  };
};

const createToken = async (stockCorrection, approver) => {
  const payload = {
    stockCorrectionId: stockCorrection.id,
    userId: approver.id,
  };
  const expires = moment().add(7, 'days');

  const token = await tokenService.generatePayloadToken(payload, expires);

  return token;
};
