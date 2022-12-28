
const faker = require('faker');
const httpStatus = require('http-status');
const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const ProcessSendCreateApproval = require('../../workers/ProcessSendCreateApproval.worker');
const CheckJournal = require('./../CheckJournal');
const request = require('supertest');
const token = require('@src/modules/auth/services/token.service');
const app = require('@src/app');
const moment = require('moment');

jest.mock('@src/modules/auth/services/getToken.service')

jest.mock('../../workers/ProcessSendCreateApproval.worker');
beforeEach(() => {
  ProcessSendCreateApproval.mockClear();
});

describe('Purchase Return - CreateFormRequest', () => {
  let recordFactories, createFormRequestDto, jwtoken
  beforeEach(async (done) => {
      recordFactories = await generateRecordFactories();
      createFormRequestDto = generateCreateFormRequestDto(recordFactories);
      jwtoken = token.generateToken(recordFactories.maker.id);
      done();
  });

  it('check saved data same with data sent', async () => {
    const { branch, maker, approver, supplier, item } = recordFactories;

    await request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect(async (res) => {
        expect(res.status).toEqual(httpStatus.CREATED);
        expect(res.body.data).toMatchObject({
          id: expect.any(Number),
          purchaseInvoiceId: createFormRequestDto.purchaseInvoiceId,
          warehouseId: createFormRequestDto.warehouseId,
          supplierId: createFormRequestDto.supplierId,
          supplierName: supplier.name,
          supplierAddress: supplier.address,
          supplierPhone: supplier.phone,
          amount: createFormRequestDto.amount,
          tax: createFormRequestDto.tax,
          items: [
            {
              id: expect.any(Number),
              purchaseReturnId: res.body.data.id,
              purchaseInvoiceItemId: createFormRequestDto.items[0].purchaseInvoiceItemId,
              itemId: createFormRequestDto.items[0].itemId,
              itemName: item.name,
              expiryDate: createFormRequestDto.items[0].expiryDate,
              productionNumber: createFormRequestDto.items[0].productionNumber,
              quantityInvoice: createFormRequestDto.items[0].quantityInvoice,
              quantity: createFormRequestDto.items[0].quantity,
              price: createFormRequestDto.items[0].price,
              discountPercent: createFormRequestDto.items[0].discountPercent,
              discountValue: createFormRequestDto.items[0].discountValue,
              unit: createFormRequestDto.items[0].unit,
              converter: createFormRequestDto.items[0].converter,
              notes: createFormRequestDto.items[0].notes,
              allocationId: createFormRequestDto.invoices[0].allocationId
            }
          ],
          form: {
            done: false,
            approvalStatus: 0,
            id: expect.any(Number),
            branchId: branch.id,
            date: createFormRequestDto.date.toISOString(),
            number: 'PRETURN' + moment(createFormRequestDto.date).format('YYMM') + '001',
            notes: createFormRequestDto.notes,
            createdBy: maker.id,
            updatedBy: maker.id,
            incrementNumber: 1,
            incrementGroup: Number(moment(createFormRequestDto.date).format('YYMM')),
            formableId: res.body.data.id,
            formableType: 'PurchaseReturn',
            requestApprovalTo: approver.id,
          }
        });

        const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne({
          where: { id: res.body.data.id }
        });
        expect(purchaseReturn).toMatchObject({
          id: res.body.data.id,
          purchaseInvoiceId: createFormRequestDto.purchaseInvoiceId,
          warehouseId: createFormRequestDto.warehouseId,
          supplierId: createFormRequestDto.supplierId,
          supplierName: supplier.name,
          supplierAddress: supplier.address,
          supplierPhone: supplier.phone,
          amount: createFormRequestDto.amount,
          tax: createFormRequestDto.tax,
        });

        const purchaseReturnForm = await tenantDatabase.Form.findOne({
          where: { id: res.body.data.form.id }
        });
        expect(purchaseReturnForm).toMatchObject({
          done: false,
          approvalStatus: 0,
          id: res.body.data.form.id,
          BranchId: branch.id,
          date: createFormRequestDto.date,
          number: 'PRETURN' + moment(createFormRequestDto.date).format('YYMM') + '001',
          notes: createFormRequestDto.notes,
          createdBy: maker.id,
          updatedBy: maker.id,
          incrementNumber: 1,
          incrementGroup: Number(moment(createFormRequestDto.date).format('YYMM')),
          formableId: res.body.data.id,
          formableType: 'PurchaseReturn',
          requestApprovalTo: approver.id,
        });

        const purchaseReturnItem = await tenantDatabase.PurchaseReturnItem.findAll({
          where: { purchaseReturnId: res.body.data.id }
        });
        expect(purchaseReturnItem[0]).toMatchObject({
          id: res.body.data.items[0].id,
          purchaseReturnId: res.body.data.id,
          purchaseInvoiceItemId: createFormRequestDto.items[0].purchaseInvoiceItemId,
          itemId: createFormRequestDto.items[0].itemId,
          expiryDate: createFormRequestDto.items[0].expiryDate,
          productionNumber: createFormRequestDto.items[0].productionNumber,
          quantityInvoice: createFormRequestDto.items[0].quantityInvoice,
          quantity: createFormRequestDto.items[0].quantity,
          price: createFormRequestDto.items[0].price,
          discountPercent: createFormRequestDto.items[0].discountPercent,
          discountValue: createFormRequestDto.items[0].discountValue,
          unit: createFormRequestDto.items[0].unit,
          converter: createFormRequestDto.items[0].converter,
          notes: createFormRequestDto.items[0].notes,
          allocationId: createFormRequestDto.invoices[0].allocationId
        });

        const purchaseInvoice = purchaseReturn.getPurchaseInvoice();
        expect(purchaseInvoice).toBeDefined();

        const activity = await tenantDatabase.UserActivity.findOne({
          where: {
            number: purchaseReturnForm.number,
            activity: 'Created',
          }
        })
        expect(activity).toBeDefined();
      })

      // check form number increased
      await request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect(async (res) => {
        expect(res.status).toEqual(httpStatus.CREATED);
        const purchaseReturnForm = await tenantDatabase.Form.findOne({
          where: { id: res.body.data.form.id }
        });
        expect(purchaseReturnForm).toMatchObject({
          number: 'PRETURN' + moment(createFormRequestDto.date).format('YYMM') + '002',
        });
      })
  });

  it('can\'t create when requested by user that does not have branch default', async (done) => {
    const { branchUser } = recordFactories
    await branchUser.update({
      isDefault: false
    });

    request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: 'please set default branch to create this form'
        })
      })
      .end(done);
  });

  it('can\'t create when requested by user that does not have access to create', async (done) => {
    await tenantDatabase.RoleHasPermission.destroy({
      where: {},
      truncate: true
    });

    request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.FORBIDDEN);
        expect(res.body).toMatchObject({
          message: 'Forbidden'
        });
      })
      .end(done);
  });

  describe('throw if required data is empty', () => {
    it('throw on object', async (done) => {
      delete createFormRequestDto['date']
      delete createFormRequestDto['purchaseInvoiceId']
      delete createFormRequestDto['supplierId']
      delete createFormRequestDto['warehouseId']
      delete createFormRequestDto['items']
      delete createFormRequestDto['subTotal']
      delete createFormRequestDto['taxBase']
      delete createFormRequestDto['tax']
      delete createFormRequestDto['amount']
  
      request(app)
        .post('/v1/purchase/return')
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(createFormRequestDto)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.status).toEqual(httpStatus.BAD_REQUEST);
          expect(res.body).toMatchObject({
            message: 'invalid data',
            meta: expect.arrayContaining([
              `"date" is required`,
              `"purchaseInvoiceId" is required`,
              `"supplierId" is required`,
              `"warehouseId" is required`,
              `"items" is required`,
              `"subTotal" is required`,
              `"taxBase" is required`,
              `"tax" is required`,
              `"amount" is required`,
            ])
          })
        })
        .end(done);
    });

    it('throw on items empty', async (done) => {
      createFormRequestDto.items = []
  
      request(app)
        .post('/v1/purchase/return')
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(createFormRequestDto)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.status).toEqual(httpStatus.BAD_REQUEST);
          expect(res.body).toMatchObject({
            message: `"items" must contain at least 1 items`
          })
        })
        .end(done);
    });

    it('throw on items object', async (done) => {
      delete createFormRequestDto.items[0]['purchaseInvoiceItemId']
      delete createFormRequestDto.items[0]['qtyInvoice']
      delete createFormRequestDto.items[0]['quantity']
      delete createFormRequestDto.items[0]['unit']
      delete createFormRequestDto.items[0]['converter']
      delete createFormRequestDto.items[0]['price']
      delete createFormRequestDto.items[0]['discountValue']
      delete createFormRequestDto.items[0]['total']
  
      request(app)
        .post('/v1/purchase/return')
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(createFormRequestDto)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.status).toEqual(httpStatus.BAD_REQUEST);
          expect(res.body).toMatchObject({
            message: 'invalid data',
            meta: expect.arrayContaining([
              `"qtyInvoice" is required`,
              `"purchaseInvoiceItemId" is required`,
              `"quantity" is required`,
              `"unit" is required`,
              `"converter" is required`,
              `"price" is required`,
              `"discountValue" is required`,
              `"total" is required`
            ])
          })
        })
        .end(done);
    });
  });

  it('throw error if form number already in database', async () => {
    const { maker, approver } = recordFactories;
    await request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.CREATED);
      });

    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();
    const purchaseReturnForm = await purchaseReturn.getForm();

    // check if use existing form number it will throw
    await expect(async () => {
      await factory.form.create({
        branch,
        number: purchaseReturnForm.number,
        formable: purchaseReturn,
        formableType: 'PurchaseReturn',
        createdBy: maker.id,
        updatedBy: maker.id,
        requestApprovalTo: approver.id,
      });
    }).rejects.toThrow();
  });

  it('throw if form invoice already done', async (done) => {
    const { purchaseInvoice } = recordFactories;
    const formPurchaseInvoice = await purchaseInvoice.getForm();
    await formPurchaseInvoice.update({
      done: true,
    });

    request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: 'purchase invoice form already done'
        })
      })
      .end(done);
  });

  it('throw error if notes more than 255 character', async (done) => {
    createFormRequestDto.notes = faker.datatype.string(300)

    request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.BAD_REQUEST);
        expect(res.body).toMatchObject({
          message: `"notes" length must be less than or equal to 255 characters long`
        })
      })
      .end(done);
  });

  it('trim notes if have space at start or end', async (done) => {
    createFormRequestDto.notes = ' example notes ';

    request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.CREATED);
        expect(res.body.data.form).toMatchObject({
          notes: 'example notes',
        })
      })
      .end(done);
  });

  it('throw error if quantity return more than invoice', async (done) => {
    // create form first to reduce available qty
    await request(app)
      .patch('/v1/purchase/return/' + purchaseReturn.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.CREATED);
      });

    const { purchaseInvoiceItem } = recordFactories;
    const available = await purchaseInvoiceItem.getAvailableQty();
    request(app)
      .patch('/v1/purchase/return/' + purchaseReturn.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body.data.form).toMatchObject({
          message: `qty return more than available, available ${available} returned ${createFormRequestDto.items[0].quantity}`
        })
      })
      .end(done);
  });

  it('throw error if total per item invalid', async (done) => {
    const itemName = createFormRequestDto.items[0].itemName;
    const expected = createFormRequestDto.items[0].quantity *
      (createFormRequestDto.items[0].price - createFormRequestDto.items[0].discountValue);
    const total = expected + 10000;
    createFormRequestDto.items[0].total = total;
        

    request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body.data.form).toMatchObject({
          message: `total for item ${itemName} is invalid, expected ${expected} get ${total}`
        })
      })
      .end(done);
  });

  it('throw error if sub total invalid', async (done) => {
    let expected = 0;
    for (const item of createFormRequestDto.items) {
      expected = expected + item.total;
    }
    const subTotal = expected + 10000;
    createFormRequestDto.subTotal = subTotal;

    request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body.data.form).toMatchObject({
          message: `subTotal is invalid, expected ${expected} get ${subTotal}`
        })
      })
      .end(done);
  });

  it('throw error if tax base invalid', async (done) => {
    let expected = createFormRequestDto.subTotal - createFormRequestDto.discount;
    const taxBase = expected + 10000;
    createFormRequestDto.taxBase = taxBase;

    request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body.data.form).toMatchObject({
          message: `taxBase is invalid, expected ${expected} get ${taxBase}`
        })
      })
      .end(done);
  });

  it('throw error if tax method not same as invoice', async (done) => {
    createFormRequestDto.typeOfTax = 'include';

    request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body.data.form).toMatchObject({
          message: `typeOfTax must same with invoice`
        })
      })
      .end(done);
  });

  it('throw error if tax invalid', async (done) => {
    let expected = createFormRequestDto.taxBase * (10 / 110);
    const tax = expected + 10000;
    createFormRequestDto.tax = tax;

    request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body.data.form).toMatchObject({
          message: `tax is invalid, expected ${expected} get ${tax}`
        })
      })
      .end(done);
  });

  it('throw error if amount invalid (tax include)', async (done) => {
    const { purchaseInvoice } = recordFactories;
    await purchaseInvoice.update({
      taxMethod: 'include',
    });
    let expected = createFormRequestDto.taxBase;
    const amount = expected + 10000;
    createFormRequestDto.amount = amount;
    createFormRequestDto.taxMethod = 'include'

    request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body.data.form).toMatchObject({
          message: `tax is invalid, expected ${expected} get ${amount}`
        })
      })
      .end(done);
  });

  it('throw error if amount invalid (tax exclude)', async (done) => {
    let expected = createFormRequestDto.taxBase + createFormRequestDto.tax;
    const amount = expected + 10000;
    createFormRequestDto.amount = amount;


    request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body.data.form).toMatchObject({
          message: `tax is invalid, expected ${expected} get ${amount}`
        })
      })
      .end(done);
  });

  it('throw error when setting journal is missing', async (done) => {
    const { settingJournal } = recordFactories;
    await settingJournal.destroy();

    request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `Journal purchase account - account payable not found`
        })
      })
      .end(done);
  });

  it('check journal balance ', async () => {
    const { isBalance, debit, credit } = await new CheckJournal(tenantDatabase, {
      createFormRequestDto
    }).call();

    expect(isBalance).toEqual(true);
    expect(debit).toEqual(credit);
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