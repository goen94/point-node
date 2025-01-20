const httpStatus = require('http-status');
const moment = require('moment');
const logger = require('@src/config/logger');
const ApiError = require('@src/utils/ApiError');
const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const tokenService = require('@src/modules/auth/services/token.service');
const DeleteFormApprove = require('./DeleteFormApprove');
const DeleteFormApproveByToken = require('./DeleteFormApproveByToken');

describe('Stock Correction - Create Form Approve By Token', () => {
  describe('validations', () => {
    it('throw error when token is invalid', async () => {
      await expect(async () => {
        await new DeleteFormApproveByToken(tenantDatabase, 'invalid-token').call();
      }).rejects.toThrow(new ApiError(httpStatus.BAD_REQUEST, 'invalid token'));
    });

    it('throw error when stock correction is not requested to be delete', async () => {
      const { approver, stockCorrection, stockCorrectionForm } = await generateRecordFactories();
      await stockCorrectionForm.update({
        cancellationStatus: 1,
      });
      const token = await createToken(stockCorrection, approver);

      await expect(async () => {
        await new DeleteFormApproveByToken(tenantDatabase, token).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Stock correction is not requested to be delete'));
    });
  });

  describe('success', () => {
    let stockCorrection, stockCorrectionForm;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories({ stockCorrectionForm: { cancellationStatus: 0 } });
      const { approver } = recordFactories;
      ({ stockCorrection, stockCorrectionForm } = recordFactories);

      const token = await createToken(stockCorrection, approver);

      ({ stockCorrection } = await new DeleteFormApproveByToken(tenantDatabase, token).call());

      done();
    });

    it('change form status to approved', async () => {
      await stockCorrectionForm.reload();
      expect(stockCorrectionForm.cancellationStatus).toEqual(1);
    });
  });

  describe('failed', () => {
    let stockCorrection, token;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories({ stockCorrectionForm: { cancellationStatus: 0 } });
      const { approver } = recordFactories;
      ({ stockCorrection } = recordFactories);

      token = await createToken(stockCorrection, approver);

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
    ...stockCorrectionForm,
    branch,
    createdBy: maker.id,
    updatedBy: maker.id,
    requestApprovalTo: approver.id,
    formable: stockCorrection,
    formableType: 'StockCorrection',
    number: 'SC2101001',
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
