const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const Queue = require('bull');
const ProcessSendCreateApproval = require('../services/ProcessSendCreateApproval');
const ProcessSendCreateApprovalWorker = require('./ProcessSendCreateApproval.worker');

describe('Process Send Create Approval Worker', () => {
  let stockCorrection;
  beforeEach(async (done) => {
    const recordFactories = await generateRecordFactories();
    ({ stockCorrection } = recordFactories);

    done();
  });

  it('create worker', () => {
    const tenantName = tenantDatabase.sequelize.config.database.replace('point_', '');
    const processSendCreateApproval = jest.spyOn(ProcessSendCreateApproval.prototype, 'call').mockImplementation(() => {});
    const queueProcessSpy = jest.spyOn(Queue.prototype, 'process').mockImplementation((callback) => {
      callback();
    });
    const params = {
      tenantName,
      stockCorrectionId: stockCorrection.id,
    };

    const processSendCreateApprovalWorker = new ProcessSendCreateApprovalWorker(params);
    processSendCreateApprovalWorker.call();
    expect(queueProcessSpy).toHaveBeenCalled();
    expect(processSendCreateApproval).toHaveBeenCalled();
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
