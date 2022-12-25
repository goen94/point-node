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

describe('Purcahse Return - FindOne', () => {
  let recordFactories, createFormRequestDto, jwtoken
  beforeEach(async (done) => {
    recordFactories = await generateRecordFactories();
    createFormRequestDto = generateCreateFormRequestDto(recordFactories);
    jwtoken = token.generateToken(recordFactories.maker.id);
    request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .end(done);
  });

  it('success return data', async () => {
    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();
    const { maker, approver } = recordFactories;
    await request(app)
      .get('/v1/purchase/return/' + purchaseReturn.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .expect('Content-Type', /json/)
      .expect(async (res) => {
        const form = await purchaseReturn.getForm();
        const supplier = await purchaseReturn.getSupplier();
        const items = await purchaseReturn.getItems();
        const allocation = await items[0].getAllocation();
        const purchaseInvoice = await purchaseReturn.getPurchaseInvoice();
        const purchaseInvoiceForm = await purchaseInvoice.getForm();

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
          supplier: {
            id: supplier.id,
            code: supplier.code,
            name: supplier.name,
            address: supplier.address,
            city: supplier.city,
            state: supplier.state,
            country: supplier.country,
            phone: supplier.phone,
            email: supplier.email
          },
          items: [
            {
              id: items[0].id,
              purchaseReturnId: items[0].purchaseReturnId,
              purchaseInvoiceItemId: items[0].purchaseInvoiceItemId,
              itemId: items[0].itemId,
              itemName: items[0].itemName,
              expiryDate: items[0].expiryDate,
              productionNumber: items[0].productionNumber,
              quantityInvoice: items[0].quantityInvoice,
              quantity: items[0].quantity,
              price: items[0].price,
              discountPercent: items[0].discountPercent,
              discountValue: items[0].discountValue,
              unit: items[0].unit,
              converter: items[0].converter,
              notes: items[0].notes,
              allocationId: items[0].allocationId,
              allocation: {
                id: allocation.id,
                name: allocation.name
              }
            }
          ],
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
            cancellationApprovalAt: form.cancellationApprovalAt,
            cancellationApprovalBy: form.cancellationApprovalBy,
            cancellationApprovalReason: form.cancellationApprovalReason,
            cancellationStatus: form.cancellationStatus,
            requesteApprovalToUser: {
              id: approver.id,
              fullName: approver.fullName,
              name: approver.name,
              firstName: approver.firstName,
              lastName: approver.lastName,
              address: approver.address,
              phone: approver.address,
              email: approver.email
            },
            createdByUser: {
              id: maker.id,
              fullName: maker.fullName,
              name: maker.name,
              firstName: maker.firstName,
              lastName: maker.lastName,
              address: maker.address,
              phone: maker.address,
              email: maker.email
            }
          },
          purchaseInvoice: {
            id: purchaseInvoice.id,
            form: {
              number: purchaseInvoiceForm.number
            }
          }
        })
      });
  });

  it('throw when requested by user that does not have branch default ', async (done) => {
    const { branchUser } = recordFactories
    await branchUser.update({
      isDefault: false
    });

    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();

    request(app)
      .get('/v1/purchase/return/' + purchaseReturn.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: 'please set default branch to read this form'
        })
      })
      .end(done);
  });

  it('throw when requested by user that does not have read permission ', async (done) => {
    await tenantDatabase.RoleHasPermission.destroy({
      where: {},
      truncate: true
    });
    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();

    request(app)
      .get('/v1/purchase/return/' + purchaseReturn.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.FORBIDDEN);
        expect(res.body).toMatchObject({
          message: 'Forbidden'
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
    approver: approver.id,
    approverName: approver.name,
    approverEmail: approver.email,
    subTotal: 100000,
    typeOfTax: 'exclude',
    taxbase: 100000,
    total: 109090.90909090909,
    tax: 9090.90909090909
  };
};