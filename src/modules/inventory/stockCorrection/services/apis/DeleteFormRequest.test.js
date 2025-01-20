const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const ProcessSendDeleteApproval = require('../../workers/ProcessSendDeleteApproval.worker');
const DeleteFormRequest = require('./DeleteFormRequest');

jest.mock('../../workers/ProcessSendDeleteApproval.worker');
beforeEach(() => {
  ProcessSendDeleteApproval.mockClear();
});

describe('Stock Correction - Delete Form Request', () => {
  describe('validations', () => {
    it('throw error when stock correction is not exist', async () => {
      const maker = await factory.user.create();

      await expect(async () => {
        await new DeleteFormRequest(tenantDatabase, {
          maker,
          stockCorrectionId: 'invalid-id',
          deleteFormRequestDto: {
            reason: 'example reason',
          },
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'Stock correction is not exist'));
    });

    it('throw error when approved by unwanted user', async () => {
      const hacker = await factory.user.create();
      const { stockCorrection } = await generateRecordFactories();

      await expect(async () => {
        await new DeleteFormRequest(tenantDatabase, {
          maker: hacker,
          stockCorrectionId: stockCorrection.id,
          deleteFormRequestDto: {
            reason: 'example reason',
          },
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'Forbidden - You are not the maker of the stock correction'));
    });

    it('throw error when stock correction is already done', async () => {
      const recordFactories = await generateRecordFactories();
      const { approver, stockCorrectionForm, maker } = recordFactories;
      let { stockCorrection } = recordFactories;
      await stockCorrectionForm.update({
        cancellationStatus: 0,
        requestCancellationTo: approver.id,
        done: true,
      });

      await expect(async () => {
        ({ stockCorrection } = await new DeleteFormRequest(tenantDatabase, {
          maker,
          stockCorrectionId: stockCorrection.id,
          deleteFormRequestDto: {
            reason: 'example reason',
          },
        }).call());
      }).rejects.toThrow(
        new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Can not delete already referenced stock correction')
      );
    });
  });

  describe('success', () => {
    let stockCorrection, stockCorrectionForm, deleteFormRequestDto;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      const { maker } = recordFactories;
      ({ stockCorrection, stockCorrectionForm } = recordFactories);

      deleteFormRequestDto = {
        reason: 'example reason',
      };

      ({ stockCorrection } = await new DeleteFormRequest(tenantDatabase, {
        maker,
        stockCorrectionId: stockCorrection.id,
        deleteFormRequestDto,
      }).call());

      done();
    });

    it('change form cancellation status to pending', async () => {
      await stockCorrectionForm.reload();
      expect(stockCorrectionForm.cancellationStatus).toEqual(0);
      expect(stockCorrectionForm.requestCancellationReason).toEqual(deleteFormRequestDto.reason);
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
  maker = await factory.user.create(maker);
  approver = await factory.user.create(approver);
  branch = await factory.branch.create(branch);
  warehouse = await factory.warehouse.create({ branch, ...warehouse });
  item = await factory.item.create(item);
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
