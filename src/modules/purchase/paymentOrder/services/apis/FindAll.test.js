const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const CreateFormRequest = require('./CreateFormRequest');
const FindAll = require('./FindAll');

describe('Payment Order - FindAll', () => {
  let maker, purchaseInvoice, purchaseDownPayment, purchaseReturn, chartOfAccountExpense,
      chartOfAccountIncome, approver, supplier, allocation, createFormRequestDto
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      ({ purchaseInvoice, purchaseDownPayment, purchaseReturn, chartOfAccountExpense,
        chartOfAccountIncome, approver, maker, supplier, allocation } = recordFactories);
      createFormRequestDto = generateCreateFormRequestDto({
        purchaseInvoice,
        purchaseDownPayment,
        purchaseReturn,
        chartOfAccountExpense,
        chartOfAccountIncome,
        maker,
        approver,
        supplier,
        allocation,
      });

      await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call();

      done();
    });

    describe('read fail', () => {
      it('throw when requested by user that does not have branch default ', async () => {
        const maker = await factory.user.create();
        const branch = await factory.branch.create();
        await factory.branchUser.create({ user: maker, branch, isDefault: false });

        await expect(async () => {
          await new FindAll(tenantDatabase, maker).call();
        }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'please set default branch to read this form'));
      })

      it('throw when requested by user that does not have read permission ', async () => {
        await tenantDatabase.RoleHasPermission.destroy({
          where: {},
          truncate: true
        });

        await expect(async () => {
          await new FindAll(tenantDatabase, maker).call();
        }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'you don\'t have permission to read this form'));
      })
    })

    describe('read success', () => {
      it('success return data', async () => {
        const { paymentOrder } = await new FindAll(tenantDatabase, maker).call();
        expect(paymentOrder).toMatchObject([{
          id: expect.any(Number),
          paymentType: createFormRequestDto.paymentType,
          supplierId: createFormRequestDto.supplierId,
          supplierName: supplier.name,
          amount: createFormRequestDto.totalAmount + '.000000000000000000000000000000',
          invoices: [{
            id: expect.any(Number),
            purchasePaymentOrderId: expect.any(Number),
            amount: createFormRequestDto.invoices[0].amount + '.000000000000000000000000000000',
            referenceableId: createFormRequestDto.invoices[0].id,
            referenceableType: 'PurchaseInvoice',
          }],
          downPayments: [{
            id: expect.any(Number),
            purchasePaymentOrderId: expect.any(Number),
            amount: createFormRequestDto.downPayments[0].amount + '.000000000000000000000000000000',
            referenceableId: createFormRequestDto.downPayments[0].id,
            referenceableType: 'PurchaseDownPayment',
          }],
          returns: [{
            id: expect.any(Number),
            purchasePaymentOrderId: expect.any(Number),
            amount: createFormRequestDto.returns[0].amount + '.000000000000000000000000000000',
            referenceableId: createFormRequestDto.returns[0].id,
            referenceableType: 'PurchaseReturn',
          }],
          others: [
            {
              id: expect.any(Number),
              purchasePaymentOrderId: expect.any(Number),
              chartOfAccountId: createFormRequestDto.others[0].coaId,
              notes: createFormRequestDto.others[0].notes,
              amount: createFormRequestDto.others[0].amount + '.000000000000000000000000000000',
            },
            {
              id: expect.any(Number),
              purchasePaymentOrderId: expect.any(Number),
              chartOfAccountId: createFormRequestDto.others[1].coaId,
              notes: createFormRequestDto.others[1].notes,
              amount: createFormRequestDto.others[1].amount + '.000000000000000000000000000000',
            }
          ],
          form: {
            number: expect.any(String),
            formableId: expect.any(Number),
            formableType: 'PurchasePaymentOrder',
            createdBy: maker.id,
            requestApprovalTo: createFormRequestDto.requestApprovalTo,
          }
        }])
      })
    })
})

const generateRecordFactories = async ({
  maker,
  approver,
  branch,
  branchUser,
  warehouse,
  supplier,
  item,
  itemUnit,
  allocation,
  purchaseInvoice,
  formPurchaseInvoice,
  purchaseDownPayment,
  formPurchaseDownPayment,
  purchaseReturn,
  formPurchaseReturn,
} = {}) => {
  const chartOfAccountType = await tenantDatabase.ChartOfAccountType.create({
    name: 'account payable',
    alias: 'hutang usaha',
    isDebit: false,
  });
  const chartOfAccount = await tenantDatabase.ChartOfAccount.create({
    typeId: chartOfAccountType.id,
    position: '',
    name: 'account payable',
    alias: 'hutang dagang',
  });
  const settingJournal = await tenantDatabase.SettingJournal.create({
    feature: 'purchase',
    name: 'account payable',
    description: 'account payable',
    chartOfAccountId: chartOfAccount.id,
  });
  await tenantDatabase.SettingJournal.create({
    feature: 'purchase',
    name: 'down payment',
    description: 'down payment',
    chartOfAccountId: chartOfAccount.id,
  });
  const chartOfAccountTypeExpense = await tenantDatabase.ChartOfAccountType.create({
    name: 'direct expense',
    alias: 'beban operasional',
    isDebit: true,
  });
  const chartOfAccountExpense = await tenantDatabase.ChartOfAccount.create({
    typeId: chartOfAccountTypeExpense.id,
    position: '',
    name: 'other expense',
    alias: 'beban lain-lain',
  });
  const chartOfAccountTypeIncome = await tenantDatabase.ChartOfAccountType.create({
    name: 'other income',
    alias: 'pendapatan lain-lain',
    isDebit: false,
  });
  const chartOfAccountIncome = await tenantDatabase.ChartOfAccount.create({
    typeId: chartOfAccountTypeIncome.id,
    position: '',
    name: 'other income',
    alias: 'pendapatan lain-lain',
  });
  maker = maker || (await factory.user.create());
  approver = approver || (await factory.user.create());
  branch = branch || (await factory.branch.create());
  await factory.permission.create('purchase payment order', maker);
  // create relation between maker and branch for authorization
  branchUser = branchUser || (await factory.branchUser.create({ user: maker, branch, isDefault: true }));
  warehouse = await factory.warehouse.create({ branch, ...warehouse });
  supplier = supplier || (await factory.supplier.create({ branch }));
  // create relation between maker and warehouse for authorization
  item = item || (await factory.item.create());
  itemUnit = itemUnit || (await factory.itemUnit.create({ item, createdBy: maker.id }));
  allocation = allocation || (await factory.allocation.create({ branch }));
  purchaseInvoice = purchaseInvoice || (await factory.purchaseInvoice.create({ supplier }));
  formPurchaseInvoice =
  formPurchaseInvoice ||
    (await factory.form.create({
      branch,
      number: 'PI2211001',
      formable: purchaseInvoice,
      formableType: 'PurchaseInvoice',
      createdBy: maker.id,
      updatedBy: maker.id,
      requestApprovalTo: approver.id,
      approvalStatus: 1,
    }));
  purchaseDownPayment = purchaseDownPayment || (await factory.purchaseDownPayment.create({ supplier }));
  formPurchaseDownPayment =
  formPurchaseDownPayment ||
    (await factory.form.create({
      branch,
      number: 'PDP2211001',
      formable: purchaseDownPayment,
      formableType: 'PurchaseDownPayment',
      createdBy: maker.id,
      updatedBy: maker.id,
      requestApprovalTo: approver.id,
      approvalStatus: 1,
    }));
  purchaseReturn = purchaseReturn || (await factory.purchaseReturn.create({ supplier, purchaseInvoice, warehouse }));
  formPurchaseReturn =
  formPurchaseReturn ||
    (await factory.form.create({
      branch,
      number: 'PR2211001',
      formable: purchaseReturn,
      formableType: 'PurchaseReturn',
      createdBy: maker.id,
      updatedBy: maker.id,
      requestApprovalTo: approver.id,
      approvalStatus: 1,
    }));
  return {
    maker,
    approver,
    branch,
    branchUser,
    warehouse,
    supplier,
    item,
    itemUnit,
    allocation,
    purchaseInvoice,
    formPurchaseInvoice,
    purchaseDownPayment,
    formPurchaseDownPayment,
    purchaseReturn,
    formPurchaseReturn,
    chartOfAccountExpense,
    chartOfAccountIncome,
    settingJournal,
  };
};

const generateCreateFormRequestDto = ({
  purchaseInvoice,
  purchaseDownPayment,
  purchaseReturn,
  chartOfAccountExpense,
  chartOfAccountIncome,
  maker,
  approver,
  supplier,
  allocation,
}) => ({
  paymentType: 'cash',
  supplierId: supplier.id || 1,
  supplierName: supplier.name || 'Supplier',
  date: new Date('2022-12-03'),
  invoices: [{
    id: purchaseInvoice.id,
    amount: 100000
  }],
  downPayments: [{
    id: purchaseDownPayment.id,
    amount: 20000
  }],
  returns: [{
    id: purchaseReturn.id,
    amount: 10000
  }],
  others: [
    {
      coaId: chartOfAccountExpense.id,
      notes: 'example notes',
      amount: 5000,
      allocationId: allocation.id,
    },
    {
      coaId: chartOfAccountIncome.id,
      notes: 'example notes',
      amount: 10000,
      allocationId: allocation.id,
    },
  ],
  createdBy: maker.id,
  requestApprovalTo: approver.id,
  totalInvoiceAmount: 100000,
  totalDownPaymentAmount: 20000,
  totalReturnAmount: 10000,
  totalOtherAmount: 5000,
  totalAmount: 65000,
  notes: 'example form note',
});