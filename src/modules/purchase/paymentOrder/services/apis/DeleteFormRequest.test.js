const faker = require('faker');
const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const httpStatus = require('http-status');
const request = require('supertest');
const token = require('@src/modules/auth/services/token.service');
const app = require('@src/app');
const ProcessSendCreateApproval = require('../../workers/ProcessSendCreateApproval.worker');

jest.mock('@src/modules/auth/services/getToken.service')

jest.mock('../../workers/ProcessSendCreateApproval.worker');
beforeEach(() => {
  ProcessSendCreateApproval.mockClear();
});

describe('Payment Order - DeleteFormRequest', () => {
  let recordFactories, createFormRequestDto, jwtoken
  beforeEach(async (done) => {
    recordFactories = await generateRecordFactories();
    createFormRequestDto = generateCreateFormRequestDto(recordFactories);
    jwtoken = token.generateToken(recordFactories.maker.id);

    request(app)
      .post('/v1/purchase/payment-order')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .end(done);
  });

  it('throw error when requested by user with different branch', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    const { maker } = recordFactories;
    await tenantDatabase.BranchUser.destroy({
      where: {},
      truncate: true
    });
    const branch = await factory.branch.create();
    await factory.branchUser.create({ user: maker, branch, isDefault: true });

    const deleteFormRequestDto = {
      reason: 'example reason',
    };

    request(app)
      .delete('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(deleteFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        console.log(res.body)
        expect(res.status).toEqual(httpStatus.FORBIDDEN);
        expect(res.body).toMatchObject({
          message: `please set default branch same as form to update this form`
        })
      })
      .end(done);
  });

  it('throw error when requested by user that does not have access to delete', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    const deleteFormRequestDto = {
      reason: 'example reason',
    };

    await tenantDatabase.RoleHasPermission.destroy({
      where: {},
      truncate: true
    });
    
    request(app)
      .delete('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(deleteFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.FORBIDDEN);
        expect(res.body).toMatchObject({
          message: `Forbidden`
        })
      })
      .end(done);
  });

  it('throw error if already referenced in payment', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    const { maker, approver, supplier, chartOfAccountIncome, chartOfAccountExpense, branch } = recordFactories;
    const payment = await factory.payment.create({ supplier, paymentType: 'cash', chartOfAccount: chartOfAccountIncome });
    await factory.paymentDetail.create({ payment, paymentOrder, chartOfAccount: chartOfAccountExpense });
    const formPayment =
      await factory.form.create({
        branch,
        reference: payment,
        createdBy: maker.id,
        updatedBy: maker.id,
        requestApprovalTo: approver.id,
        formable: payment,
        formableType: 'Payment',
        number: 'CASH/OUT/2211001',
      });

    const deleteFormRequestDto = {
      reason: 'example reason',
    };

    request(app)
      .delete('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(deleteFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `form already referenced with number ${formPayment.number}`
        })
      })
      .end(done);
  });

  it('throw error if reason is empty', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    const deleteFormRequestDto = {
      reason: '',
    };

    request(app)
      .delete('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(deleteFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.BAD_REQUEST);
        expect(res.body).toMatchObject({
          message: `"reason" is not allowed to be empty`
        })
      })
      .end(done);
  });

  it('success delete', async (done) => {
    const mailerSpy = jest.spyOn(ProcessSendCreateApproval.prototype, 'call').mockReturnValue(true);

    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();

    const deleteFormRequestDto = {
      reason: faker.datatype.string(20),
    };

    request(app)
      .delete('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(deleteFormRequestDto)
      .expect(async (res) => {
        expect(res.status).toEqual(httpStatus.NO_CONTENT);
        //expect(mailerSpy).toHaveBeenCalled();

        const form = await paymentOrder.getForm();
        expect(form.cancellationStatus).toBe(0);
        expect(form.done).toBe(false);
        expect(form.formableId).toBe(paymentOrder.id);
        expect(form.formableType).toBe('PurchasePaymentOrder');
      })
      .end(done);
  });
});

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
  await factory.permission.create('purchase payment order', approver);
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

const generateCreateFormRequestDto = (recordFactories) => {
  const {
    purchaseInvoice,
    purchaseDownPayment,
    purchaseReturn,
    chartOfAccountExpense,
    chartOfAccountIncome,
    approver,
    supplier,
    allocation,
  } = recordFactories;

  return {
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
    requestApprovalTo: approver.id,
    totalInvoiceAmount: 100000,
    totalDownPaymentAmount: 20000,
    totalReturnAmount: 10000,
    totalOtherAmount: 5000,
    totalAmount: 65000,
    notes: 'example form note',
  }
}