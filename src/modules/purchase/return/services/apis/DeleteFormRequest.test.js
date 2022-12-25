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

describe('Purchase Return - DeleteFormRequest', () => {
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

  it('success delete', async (done) => {
    const mailerSpy = jest.spyOn(ProcessSendDeleteApproval.prototype, 'call').mockReturnValue(true);

    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();

    const deleteFormRequestDto = {
      reason: faker.datatype.string(20),
    };

    request(app)
      .delete('/v1/purchase/return/' + purchaseReturn.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(deleteFormRequestDto)
      .expect(async (res) => {
        expect(res.status).toEqual(httpStatus.NO_CONTENT);
        expect(mailerSpy).toHaveBeenCalled();

        const form = await purchaseReturn.getForm();
        expect(form.cancellationStatus).toBe(0);
        expect(form.done).toBe(false);
        expect(form.formableId).toBe(purchaseReturn.id);
        expect(form.formableType).toBe('PurchaseReturn');
      })
      .end(done);
  });

  it('throw error if form already done', async (done) => {
    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();
    const purchaseReturnForm = await purchaseReturn.getForm();
    await purchaseReturnForm.update({
      done: true,
    })

    const deleteFormRequestDto = {
      reason: faker.datatype.string(20),
    };

    request(app)
      .delete('/v1/purchase/return/' + purchaseReturn.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(deleteFormRequestDto)
      .expect('Content-Type', /json/)
      .expect(async (res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: 'form already done'
        })
      })
      .end(done);
  });

  it('throw error if reason is empty', async (done) => {
    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();
    const deleteFormRequestDto = {
      reason: '',
    };

    request(app)
      .delete('/v1/purchase/return/' + purchaseReturn.id)
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

  it('throw error when requested by user with different branch', async (done) => {
    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();
    const { maker } = recordFactories;
    await tenantDatabase.BranchUser.destroy({
      where: {},
      truncate: true
    });
    const branch = await factory.branch.create();
    await factory.branchUser.create({ user: maker, branch, isDefault: true });

    const deleteFormRequestDto = {
      reason: faker.datatype.string(20),
    };

    request(app)
      .delete('/v1/purchase/return/' + purchaseReturn.id)
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

  it('throw error when requested by user with different warehouse default', async (done) => {
    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();
    const { warehouseUser } = recordFactories;
    await warehouseUser.update({
      isDefault: false
    });

    const deleteFormRequestDto = {
      reason: faker.datatype.string(20),
    };

    request(app)
      .delete('/v1/purchase/return/' + purchaseReturn.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(deleteFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        console.log(res.body)
        expect(res.status).toEqual(httpStatus.FORBIDDEN);
        expect(res.body).toMatchObject({
          message: `please set default warehouse same as form to update this form`
        })
      })
      .end(done);
  });

  it('throw error when requested by user that does not have access to delete', async (done) => {
    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();
    await tenantDatabase.RoleHasPermission.destroy({
      where: {},
      truncate: true
    });

    const deleteFormRequestDto = {
      reason: faker.datatype.string(20),
    };

    request(app)
      .delete('/v1/purchase/return/' + purchaseReturn.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(deleteFormRequestDto)
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