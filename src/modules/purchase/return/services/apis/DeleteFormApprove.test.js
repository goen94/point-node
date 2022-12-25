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

describe('Purchase Return - DeleteFormApprove', () => {
  let recordFactories, createFormRequestDto, jwtoken, makerToken
  beforeEach(async () => {
    recordFactories = await generateRecordFactories();
    createFormRequestDto = generateCreateFormRequestDto(recordFactories);
    jwtoken = token.generateToken(recordFactories.approver.id);
    makerToken = token.generateToken(recordFactories.maker.id);
    
    await request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ makerToken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
  });

  it('success approve cancellation', async () => {
    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();
    const form = await purchaseReturn.getForm();
    const { approver } = recordFactories;

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

    // approve first to add inventory and journal
    await request(app)
      .post('/v1/purchase/return/' + purchaseReturn.id + '/approve')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .expect(async () => {
        await form.reload();
        await form.update({
          cancellationStatus: 0,
          requestCancellationTo: approver.id
        });
        await request(app)
          .post('/v1/purchase/return/' + purchaseReturn.id + '/cancellation-approve')
          .set('Authorization', 'Bearer '+ jwtoken)
          .set('Tenant', 'test_dev')
          .expect(async (res) => {
            await form.reload();
            const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
            expect(res.status).toEqual(httpStatus.OK);
            expect(res.body.data).toMatchObject({
              id: purchaseReturn.id,
              purchaseInvoiceId: purchaseReturn.purchaseInvoiceId,
              warehouseId: purchaseReturn.warehouseId,
              supplierId: purchaseReturn.supplierId,
              supplierName: purchaseReturn.supplierName,
              supplierAddress: purchaseReturn.supplierAddress,
              supplierPhone: purchaseReturn.supplierPhone,
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
                approvalBy: form.approvalBy,
                approvalAt: form.approvalAt,
                approvalReason: form.approvalReason,
                approvalStatus: form.approvalStatus,
                requestCancellationTo: form.requestCancellationTo,
                requestCancellationBy: form.requestCancellationBy,
                requestCancellationAt: form.requestCancellationAt,
                requestCancellationReason: form.requestCancellationReason,
                cancellationApprovalAt: expect.stringMatching(isoPattern),
                cancellationApprovalBy: approver.id,
                cancellationApprovalReason: form.cancellationApprovalReason,
                cancellationStatus: 1,
              }
            });

            const purchaseReturnForm = await tenantDatabase.Form.findOne({
              where: { id: res.body.data.form.id }
            });
            expect(purchaseReturnForm).toMatchObject({
              cancellationStatus: 1,
              cancellationApprovalAt: expect.stringMatching(isoPattern),
              cancellationApprovalBy: approver.id,
            });

            const activity = await tenantDatabase.UserActivity.findOne({
              where: {
                number: purchaseReturnForm.number,
                activity: 'Cancellation Approved',
              }
            })
            expect(activity).toBeDefined();

            const updatedStock = await new GetCurrentStock(tenantDatabase, {
              item: item,
              date: form.date,
              warehouseId: purchaseReturn.warehouseId,
              options: {
                expiryDate: purchaseReturnItem[0].expiryDate,
                productionNumber: purchaseReturnItem[0].productionNumber,
              },
            }).call();
            expect(currentStock).toBe(updatedStock);

          });
      });
  });

  it('throw if form already cancelled', async (done) => {
    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();
    const { approver } = recordFactories;
    const formPurchaseReturn = await purchaseReturn.getForm();
    await formPurchaseReturn.update({
      cancellationStatus: 1,
      requestCancellationTo: approver.id
    });

    request(app)
      .post('/v1/purchase/return/' + purchaseReturn.id + '/cancellation-approve')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `form not requested to be delete`
        })
      })
      .end(done);
  });

  it('throw error when approved by unwanted user', async (done) => {
    const hacker = await factory.user.create();
    const { branch, approver } = recordFactories;
    await factory.branchUser.create({ user: hacker, branch, isDefault: true });
    await factory.permission.create('purchase return', hacker);
    jwtoken = token.generateToken(hacker.id);

    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();
    const formPurchaseReturn = await purchaseReturn.getForm();
    await formPurchaseReturn.update({
      cancellationStatus: 0,
      requestCancellationTo: approver.id
    });

    request(app)
      .post('/v1/purchase/return/' + purchaseReturn.id + '/cancellation-approve')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.FORBIDDEN);
        expect(res.body).toMatchObject({
          message: `Forbidden - You are not the selected approver`
        })
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