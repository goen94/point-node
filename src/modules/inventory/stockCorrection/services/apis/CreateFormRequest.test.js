const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const ProcessSendCreateApproval = require('../../workers/ProcessSendCreateApproval.worker');
const CreateFormRequest = require('./CreateFormRequest');

jest.mock('../../workers/ProcessSendCreateApproval.worker');
Date.now = jest.fn(() => new Date(Date.UTC(2021, 0, 1)).valueOf());

beforeEach(() => {
  ProcessSendCreateApproval.mockClear();
});

describe('Stock Correction - Create Form Request', () => {
  describe('validations', () => {
    it("can't create when requested by user that does not have branch default", async () => {
      const branchUser = { isDefault: false };
      const recordFactories = await generateRecordFactories({ branchUser });
      const { maker, approver, branch, warehouse, allocation, item } = recordFactories;
      const createFormRequestDto = generateCreateFormRequestDto({
        approver,
        branch,
        warehouse,
        allocation,
        item,
      });

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, { maker, createFormRequestDto }).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    });
  });
  describe('success', () => {
    let stockCorrection, stockCorrectionForm, maker, createFormRequestDto;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      const { approver, branch, warehouse, allocation, item } = recordFactories;
      ({ maker } = recordFactories);
      createFormRequestDto = generateCreateFormRequestDto({
        approver,
        branch,
        warehouse,
        allocation,
        item,
      });

      done();
    });

    it('create form with correct date', async () => {
      ({ stockCorrection, stockCorrectionForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      expect(stockCorrectionForm).toBeDefined();
      expect(stockCorrectionForm.number).toEqual('SC2101001');
      expect(stockCorrectionForm.approvalStatus).toEqual(0); // pending
    });

    it('has correct stock correction data', async () => {
      ({ stockCorrection, stockCorrectionForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      expect(stockCorrection.warehouseId).toEqual(createFormRequestDto.warehouseId);
      expect(stockCorrection.typeCorrection).toEqual(createFormRequestDto.typeCorrection);
      expect(stockCorrection.qcPassed).toEqual(createFormRequestDto.qcPassed);
    });

    it('can create with expiry date and production number', async () => {
      createFormRequestDto.items[0].expiryDate = new Date('2022-03-01');
      createFormRequestDto.items[0].productionNumber = '001';
      ({ stockCorrection, stockCorrectionForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      expect(stockCorrectionForm).toBeDefined();
      const stockCorrectionItems = await stockCorrection.getItems();
      expect(stockCorrectionItems[0].expiryDate).toEqual('2022-03-01 07:00:00');
      expect(stockCorrectionItems[0].productionNumber).toEqual('001');
    });

    it('will increase the stock correction form number', async () => {
      ({ stockCorrection, stockCorrectionForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());
      expect(stockCorrectionForm.number).toEqual('SC2101001');
      ({ stockCorrection, stockCorrectionForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());
      expect(stockCorrectionForm.number).toEqual('SC2101002');
    });
  });

  describe('failed', () => {
    let maker, userWarehouse, createFormRequestDto;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      const { approver, branch, warehouse, allocation, item } = recordFactories;
      ({ maker, userWarehouse } = recordFactories);
      createFormRequestDto = generateCreateFormRequestDto({
        approver,
        branch,
        warehouse,
        allocation,
        item,
      });

      done();
    });

    it('throws error when user warehouse is missing', async () => {
      await userWarehouse.destroy();

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow('Forbidden');
    });

    it('throws error when approver is missing', async () => {
      createFormRequestDto.requestApprovalTo = null;

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow('Approver is not exist');
    });

    it('throws error when request item without smallest unit', async () => {
      createFormRequestDto.items[0].converter = 2;

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow('Only can use smallest item unit');
    });

    it('throws error when item stock be minus', async () => {
      createFormRequestDto.items[0].stockCorrection = -200;

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow('Stock can not be minus');
    });
  });
});

const generateRecordFactories = async ({
  maker,
  approver,
  branch,
  branchUser,
  warehouse,
  userWarehouse,
  allocation,
  item,
  inventory,
  inventoryForm,
} = {}) => {
  maker = await factory.user.create(maker);
  approver = await factory.user.create(approver);
  branch = await factory.branch.create(branch);
  branchUser = await factory.branchUser.create({ user: maker, branch, isDefault: true, ...branchUser });
  warehouse = await factory.warehouse.create({ branch, ...warehouse });
  userWarehouse = await factory.userWarehouse.create({ user: maker, warehouse, isDefault: true });
  allocation = await factory.allocation.create({ branch, ...allocation });
  item = await factory.item.create({ ...item });
  inventoryForm = await factory.form.create({
    branch,
    number: 'PI2101001',
    formable: { id: 1 },
    formableType: 'PurchaseInvoice',
    createdBy: maker.id,
    updatedBy: maker.id,
    ...inventoryForm,
  });
  inventory = await factory.inventory.create({ form: inventoryForm, warehouse, item });

  return {
    maker,
    approver,
    branch,
    branchUser,
    warehouse,
    userWarehouse,
    allocation,
    item,
    inventory,
  };
};

const generateCreateFormRequestDto = ({ warehouse, item, allocation, approver }) => {
  return {
    warehouseId: warehouse.id,
    dueDate: new Date('2021-01-01'),
    items: [
      {
        itemId: item.id,
        unit: 'PCS',
        converter: 1,
        stockCorrection: -10,
        notes: 'example stock correction item note',
        allocationId: allocation.id,
      },
    ],
    notes: 'example stock correction note',
    requestApprovalTo: approver.id,
  };
};
