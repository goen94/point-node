const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const httpStatus = require('http-status');
const request = require('supertest');
const token = require('@src/modules/auth/services/token.service');
const app = require('@src/app');
const ProcessSendCreateApproval = require('../../workers/ProcessSendCreateApproval.worker');
const GetCurrentStock = require('../../../../inventory/services/GetCurrentStock');

jest.mock('@src/modules/auth/services/getToken.service')

jest.mock('../../workers/ProcessSendCreateApproval.worker');
beforeEach(() => {
  ProcessSendCreateApproval.mockClear();
});

describe('Purchase Return - CreateFormApprove', () => {
  let recordFactories, createFormRequestDto, jwtoken, makerToken
  beforeEach(async (done) => {
    recordFactories = await generateRecordFactories();
    createFormRequestDto = generateCreateFormRequestDto(recordFactories);
    jwtoken = token.generateToken(recordFactories.approver.id);
    makerToken = token.generateToken(recordFactories.maker.id);
    request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ makerToken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .end(done);
  });

  it('throw if form already approved', async (done) => {
    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();
    const formPurchaseReturn = await purchaseReturn.getForm();
    await formPurchaseReturn.update({
      approvalStatus: 1,
    });

    request(app)
      .post('/v1/purchase/return/' + purchaseReturn.id + '/approve')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `Form already approved`
        })
      })
      .end(done);
  });

  it('success approve form', async (done) => {
    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();
    const form = await purchaseReturn.getForm();
    const { approver, chartOfAccountPayable, chartOfAccountTax } = recordFactories;

    const purchaseReturnItem = await purchaseReturn.getItems();
    const item = await purchaseReturnItem[0].getItem();
    const currentStock = await new GetCurrentStock(tenantDatabase, {
      item: item,
      date: form.date,
      warehouseId: purchaseReturn.warehouseId,
      options: {
        expiryDate: purchaseReturnItem[0].expiryDate,
        productionNumber: purchaseReturnItem[0].productionNumber,
      },
    }).call();

    request(app)
      .post('/v1/purchase/return/' + purchaseReturn.id + '/approve')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .expect(async (res) => {
        await form.reload();
        expect(res.status).toEqual(httpStatus.OK);
        expect(res.body.data).toMatchObject({
          id: purchaseReturn.id,
          purchaseInvoiceId: purchaseReturn.purchaseInvoiceId,
          warehouseId: purchaseReturn.warehouseId,
          supplierId: purchaseReturn.supplierId,
          supplierName: purchaseReturn.name,
          supplierAddress: purchaseReturn.address,
          supplierPhone: purchaseReturn.phone,
          amount: purchaseReturn.amount,
          tax: purchaseReturn.tax,
          form: {
            id: form.id,
            branchId: form.branchId,
            date: form.date.toISOString(),
            number: form.number,
            editedNumber: form.editedNumber,
            notes: form.notes,
            editedNotes: form.editedNotes,
            createdBy: form.createdBy,
            updatedBy: form.updatedBy,
            done: form.done,
            incrementNumber: form.incrementNumber,
            incrementGroup: form.incrementGroup,
            formableId: form.formableId,
            formableType: form.formableType,
            requestApprovalTo: form.requestApprovalTo,
            approvalBy: approver.id,
            approvalAt: form.approvalAt.toISOString(),
            approvalReason: form.approvalReason,
            approvalStatus: 1,
            requestCancellationTo: form.requestCancellationTo,
            requestCancellationBy: form.requestCancellationBy,
            requestCancellationAt: form.requestCancellationAt,
            requestCancellationReason: form.requestCancellationReason,
            cancellationApprovalAt: form.cancellationApprovalAt,
            cancellationApprovalBy: form.cancellationApprovalBy,
            cancellationApprovalReason: form.cancellationApprovalReason,
            cancellationStatus: form.cancellationStatus,
          }
        });

        const purchaseReturnForm = await tenantDatabase.Form.findOne({
          where: { id: res.body.data.form.id }
        });
        expect(purchaseReturnForm).toMatchObject({
          approvalStatus: 1,
          approvalAt: expect.any(Date),
          approvalBy: approver.id,
        });

        const journalAp = await tenantDatabase.Journal.findOne({
          formId: purchaseReturnForm.id,
          chartOfAccountId: chartOfAccountPayable.id,          
        });
        expect(journalAp).toMatchObject({
          formId: purchaseReturnForm.id,
          chartOfAccountId: chartOfAccountPayable.id,
          debit: purchaseReturn.amount + '.000000000000000000000000000000'
        });

        const journalTax = await tenantDatabase.Journal.findOne({
          formId: purchaseReturnForm.id,
          chartOfAccountId: chartOfAccountTax.id,
        });
        expect(journalTax).toMatchObject({
          formId: purchaseReturnForm.id,
          chartOfAccountId: chartOfAccountTax.id,
          credit: purchaseReturn.tax + '.000000000000000000000000000000'
        });

        const purchaseReturnItems = await purchaseReturn.getItems();
        for (const returnItem of purchaseReturnItems) {
          const item = await returnItem.getItem();
          const journalInventory = await tenantDatabase.Journal.findOne({
            formId: purchaseReturnForm.id,
            chartOfAccountId: item.chartOfAccountId,
          });
          const total = item.quantity * (item.price - item.discountValue);
          expect(journalInventory).toMatchObject({
            formId: purchaseReturnForm.id,
            chartOfAccountId: item.chartOfAccountId,
            credit: total + '.000000000000000000000000000000'
          });
        }

        const updatedStock = await new GetCurrentStock(tenantDatabase, {
          item: item,
          date: form.date,
          warehouseId: purchaseReturn.warehouseId,
          options: {
            expiryDate: purchaseReturnItem[0].expiryDate,
            productionNumber: purchaseReturnItem[0].productionNumber,
          },
        }).call();
        expect(updatedStock).toBe(currentStock + purchaseReturnItem[0].quantity);

        const activity = await tenantDatabase.UserActivity.findOne({
          where: {
            number: purchaseReturnForm.number,
            activity: 'Approved',
          }
        })
        expect(activity).toBeDefined();
      })
      .end(done);
  })

  it('check purchase return available to payment order', async () => {
    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();
    const form = await purchaseReturn.getForm();
    const { supplier } = recordFactories;

    await request(app)
      .post('/v1/purchase/return/' + purchaseReturn.id + '/approve')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .expect(async () => {
        await request(app)
          .get('/v1/purchase/payment-order/references/' + supplier.id)
          .set('Authorization', 'Bearer '+ jwtoken)
          .set('Tenant', 'test_dev')
          .expect(async (res) => {
            expect(res.status).toEqual(httpStatus.OK);
            expect(res.body.data.returns[0]).toMatchObject({
              id: purchaseReturn.id,
              date: form.date.toISOString(),
              number: form.number,
              notes: form.notes,
              available: purchaseReturn.amount,
            });
          })
        
      });
  });

  it('throw error when approved by unwanted user', async (done) => {
    const hacker = await factory.user.create();
    const { branch } = recordFactories;
    await factory.branchUser.create({ user: hacker, branch, isDefault: true });
    await factory.permission.create('purchase return', hacker);
    jwtoken = token.generateToken(hacker.id);

    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();

    request(app)
      .post('/v1/purchase/return/' + purchaseReturn.id + '/approve')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.FORBIDDEN);
        expect(res.body).toMatchObject({
          message: 'Forbidden - You are not the selected approver'
        });
      })
      .end(done);
  });
});

const generateRecordFactories = async ({
  maker,
  approver,
  branch,
  warehouse,
  item,
  allocation,
  supplier,
  purchaseInvoice,
  purchaseInvoiceItem,
  formPurchaseInvoice,
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
  const chartOfAccountTypePayable = await tenantDatabase.ChartOfAccountType.create({
    name: 'account payable',
    alias: 'hutang usaha',
    isDebit: false,
  });
  const chartOfAccountPayable = await tenantDatabase.ChartOfAccount.create({
    typeId: chartOfAccountTypePayable.id,
    position: 'CREDIT',
    name: 'account payable',
    alias: 'hutang usaha',
  });
  const chartOfAccountTypeTax = await tenantDatabase.ChartOfAccountType.create({
    name: 'income tax receiveable',
    alias: 'ppn masukan',
    isDebit: true,
  });
  const chartOfTax = await tenantDatabase.ChartOfAccount.create({
    typeId: chartOfAccountTypeTax.id,
    position: 'DEBIT',
    name: 'income tax receiveable',
    alias: 'ppn masukan',
  });
  const settingJournal = await tenantDatabase.SettingJournal.create({
    feature: 'purchase',
    name: 'account payable',
    description: 'account payable',
    chartOfAccountId: chartOfAccountPayable.id,
  });

  maker = await factory.user.create(maker);
  await factory.permission.create('purchase return', maker);
  approver = await factory.user.create();
  branch = await factory.branch.create(branch);
  await factory.branchUser.create({ user: maker, branch, isDefault: true })
  warehouse = await factory.warehouse.create({ branch, ...warehouse });
  item = await factory.item.create({ chartOfAccount, ...item });
  allocation = await factory.allocation.create({ branch });
  supplier = await factory.supplier.create({ branch });
  const purchaseReceive = await factory.purchaseReceive.create({ supplier, warehouse });
  const purchaseReceiveItem = await factory.purchaseReceiveItem.create({ purchaseReceive, item, warehouse, allocation });
  purchaseInvoice = purchaseInvoice || (await factory.purchaseInvoice.create({ supplier }));
  purchaseInvoiceItem = purchaseInvoiceItem || 
    (await factory.purchaseInvoiceItem.create({
      purchaseInvoice, purchaseReceive, purchaseReceiveItem, item, allocation
    }));
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

  return {
    maker,
    approver,
    branch,
    warehouse,
    item,
    allocation,
    supplier,
    purchaseInvoice,
    purchaseInvoiceItem,
    formPurchaseInvoice,
    settingJournal,
    chartOfAccount,
    chartOfAccountPayable,
    chartOfTax
  };
};

const generateCreateFormRequestDto = ({ 
  approver,
  supplier,
  purchaseInvoice,
  purchaseInvoiceItem,
  item,
  warehouse,
}) => {
  return {
    purchaseInvoiceId: purchaseInvoice.id,
    supplierId: supplier.id,
    warehouseId: warehouse.id,
    date: new Date('2022-12-01 00:00:00'),
    items: [
      {
        purchaseInvoiceItemId: purchaseInvoiceItem.id,
        itemId: item.id,
        itemName: item.name,
        expiryDate: purchaseInvoiceItem.expiryDate,
        productionNumber: purchaseInvoiceItem.productionNumber,
        notes: purchaseInvoiceItem.notes,
        unit: purchaseInvoiceItem.unit,
        converter: purchaseInvoiceItem.converter,
        qtyInvoice: purchaseInvoiceItem.quantity,
        quantity: 10,
        price: purchaseInvoiceItem.price,
        discountPercent: purchaseInvoiceItem.discountPercent,
        discountValue: purchaseInvoiceItem.discountValue,
        total: 10 * (purchaseInvoiceItem.price - purchaseInvoiceItem.discountValue),
        allocationId: purchaseInvoiceItem.allocationId,
      },
    ],
    notes: 'example purchase return note',
    requestApprovalTo: approver.id,
    subTotal: 100000,
    typeOfTax: 'exclude',
    taxBase: 100000,
    amount: 109090.90909090909,
    tax: 9090.90909090909
  };
};