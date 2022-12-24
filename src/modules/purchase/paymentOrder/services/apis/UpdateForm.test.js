const faker = require('faker');
const httpStatus = require('http-status');
const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const ProcessSendCreateApproval = require('../../workers/ProcessSendCreateApproval.worker');
const CheckJournal = require('./../CheckJournal');
const request = require('supertest');
const token = require('@src/modules/auth/services/token.service');
const app = require('@src/app');

jest.mock('@src/modules/auth/services/getToken.service')

jest.mock('../../workers/ProcessSendCreateApproval.worker');
beforeEach(() => {
  ProcessSendCreateApproval.mockClear();
});

describe('Payment Order - UpdateForm', () => {
  let recordFactories, createFormRequestDto, updateFormRequestDto, jwtoken
  beforeEach(async (done) => {
    recordFactories = await generateRecordFactories();
    createFormRequestDto = generateCreateFormRequestDto(recordFactories);
    updateFormRequestDto = generateUpdateFormRequestDto(recordFactories);
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

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
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

  it('throw error when requested by user that does not have access to create', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    await tenantDatabase.RoleHasPermission.destroy({
      where: {},
      truncate: true
    });

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.FORBIDDEN);
        expect(res.body).toMatchObject({
          message: 'Forbidden'
        });
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

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `form already referenced with number ${formPayment.number}`
        })
      })
      .end(done);
  });

  describe('throw if required data is empty', () => {
    it('throw on paymentType', async (done) => {
      const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
      delete updateFormRequestDto['paymentType']
  
      request(app)
        .patch('/v1/purchase/payment-order/' + paymentOrder.id)
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(updateFormRequestDto)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.status).toEqual(httpStatus.BAD_REQUEST);
          expect(res.body).toMatchObject({
            message: `"paymentType" is required`
          })
        })
        .end(done);
    });

    it('throw on supplierId', async (done) => {
      const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
      delete updateFormRequestDto['supplierId']
  
      request(app)
        .patch('/v1/purchase/payment-order/' + paymentOrder.id)
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(updateFormRequestDto)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.status).toEqual(httpStatus.BAD_REQUEST);
          expect(res.body).toMatchObject({
            message: `"supplierId" is required`
          })
        })
        .end(done);
    });

    it('throw on date', async (done) => {
      const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
      delete updateFormRequestDto['date']
  
      request(app)
        .patch('/v1/purchase/payment-order/' + paymentOrder.id)
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(updateFormRequestDto)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.status).toEqual(httpStatus.BAD_REQUEST);
          expect(res.body).toMatchObject({
            message: `"date" is required`
          })
        })
        .end(done);
    });

    it('throw on requestApprovalTo', async (done) => {
      const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
      delete updateFormRequestDto['requestApprovalTo']
  
      request(app)
        .patch('/v1/purchase/payment-order/' + paymentOrder.id)
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(updateFormRequestDto)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.status).toEqual(httpStatus.BAD_REQUEST);
          expect(res.body).toMatchObject({
            message: `"requestApprovalTo" is required`
          })
        })
        .end(done);
    });

    it('throw if invoices array empty', async (done) => {
      const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
      updateFormRequestDto.invoices = []
  
      request(app)
        .patch('/v1/purchase/payment-order/' + paymentOrder.id)
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(updateFormRequestDto)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.status).toEqual(httpStatus.BAD_REQUEST);
          expect(res.body).toMatchObject({
            message: `"invoices" must contain at least 1 items`
          })
        })
        .end(done);
    });

    it('throw if invoices null', async (done) => {
      const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
      delete updateFormRequestDto['invoices']
  
      request(app)
        .patch('/v1/purchase/payment-order/' + paymentOrder.id)
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(updateFormRequestDto)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.status).toEqual(httpStatus.BAD_REQUEST);
          expect(res.body).toMatchObject({
            message: `"invoices" is required`
          })
        })
        .end(done);
    });

    it('throw if invoices amount null', async (done) => {
      const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
      delete updateFormRequestDto.invoices[0]['amount']
  
      request(app)
        .patch('/v1/purchase/payment-order/' + paymentOrder.id)
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(updateFormRequestDto)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.status).toEqual(httpStatus.BAD_REQUEST);
          expect(res.body).toMatchObject({
            message: `"invoices[0].amount" is required`
          })
        })
        .end(done);
    });

    it('throw if invoices amount zero', async (done) => {
      const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
      updateFormRequestDto.invoices[0].amount = 0
  
      request(app)
        .patch('/v1/purchase/payment-order/' + paymentOrder.id)
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(updateFormRequestDto)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.status).toEqual(httpStatus.BAD_REQUEST);
          expect(res.body).toMatchObject({
            message: `"invoices[0].amount" must be greater than or equal to 1`
          })
        })
        .end(done);
    });

    it('throw on totalInvoiceAmount', async (done) => {
      const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
      delete updateFormRequestDto['totalInvoiceAmount']
  
      request(app)
        .patch('/v1/purchase/payment-order/' + paymentOrder.id)
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(updateFormRequestDto)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.status).toEqual(httpStatus.BAD_REQUEST);
          expect(res.body).toMatchObject({
            message: `"totalInvoiceAmount" is required`
          })
        })
        .end(done);
    });

    it('throw on totalDownPaymentAmount', async (done) => {
      const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
      delete updateFormRequestDto['totalDownPaymentAmount']
  
      request(app)
        .patch('/v1/purchase/payment-order/' + paymentOrder.id)
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(updateFormRequestDto)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.status).toEqual(httpStatus.BAD_REQUEST);
          expect(res.body).toMatchObject({
            message: `"totalDownPaymentAmount" is required`
          })
        })
        .end(done);
    });

    it('throw on totalReturnAmount', async (done) => {
      const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
      delete updateFormRequestDto['totalReturnAmount']
  
      request(app)
        .patch('/v1/purchase/payment-order/' + paymentOrder.id)
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(updateFormRequestDto)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.status).toEqual(httpStatus.BAD_REQUEST);
          expect(res.body).toMatchObject({
            message: `"totalReturnAmount" is required`
          })
        })
        .end(done);
    });

    it('throw on totalOtherAmount', async (done) => {
      const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
      delete updateFormRequestDto['totalOtherAmount']
  
      request(app)
        .patch('/v1/purchase/payment-order/' + paymentOrder.id)
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(updateFormRequestDto)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.status).toEqual(httpStatus.BAD_REQUEST);
          expect(res.body).toMatchObject({
            message: `"totalOtherAmount" is required`
          })
        })
        .end(done);
    });

    it('throw on totalAmount', async (done) => {
      const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
      delete updateFormRequestDto['totalAmount']
  
      request(app)
        .patch('/v1/purchase/payment-order/' + paymentOrder.id)
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(updateFormRequestDto)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.status).toEqual(httpStatus.BAD_REQUEST);
          expect(res.body).toMatchObject({
            message: `"totalAmount" is required`
          })
        })
        .end(done);
    });
  });

  it('throw error if purchase invoice not exist', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    updateFormRequestDto.invoices[0].id = 200;

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.NOT_FOUND);
        expect(res.body).toMatchObject({
          message: `purchase invoice with id 200 not exist`
        })
      })
      .end(done);
  });

  it('throw error if purchase down payment not exist', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    updateFormRequestDto.downPayments[0].id = 200;

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.NOT_FOUND);
        expect(res.body).toMatchObject({
          message: `purchase down payment with id 200 not exist`
        })
      })
      .end(done);
  });

  it('throw error if purchase return not exist', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    updateFormRequestDto.returns[0].id = 200;

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.NOT_FOUND);
        expect(res.body).toMatchObject({
          message: `purchase return with id 200 not exist`
        })
      })
      .end(done);
  });

  it('throw error if supplier not exist', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    updateFormRequestDto.supplierId = 200;

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.NOT_FOUND);
        expect(res.body).toMatchObject({
          message: `supplier not exist`
        })
      })
      .end(done);
  });

  it('throw error on purchase invoice supplier invalid', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    const { purchaseInvoice, formPurchaseInvoice, branch } = recordFactories;
    const invalidSupplier = await factory.supplier.create({ branch });
    await purchaseInvoice.update({
      supplierId: invalidSupplier.id,
    });

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `invalid supplier for form ${formPurchaseInvoice.number}`
        })
      })
      .end(done);
  });

  it('throw error on purchase down payment supplier invalid', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    const { purchaseDownPayment, formPurchaseDownPayment, branch } = recordFactories;
    const invalidSupplier = await factory.supplier.create({ branch });
    await purchaseDownPayment.update({
      supplierId: invalidSupplier.id,
    });

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `invalid supplier for form ${formPurchaseDownPayment.number}`
        })
      })
      .end(done);
  });

  it('throw error on purchase return supplier invalid', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    const { purchaseReturn, formPurchaseReturn, branch } = recordFactories;
    const invalidSupplier = await factory.supplier.create({ branch });
    await purchaseReturn.update({
      supplierId: invalidSupplier.id,
    });

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `invalid supplier for form ${formPurchaseReturn.number}`
        })
      })
      .end(done);
  });

  it('throw error if purchase invoice order more than available', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    const { formPurchaseInvoice } = recordFactories;
    updateFormRequestDto.invoices[0].amount = 500000;
    updateFormRequestDto.totalInvoiceAmount = 500000;
    updateFormRequestDto.totalAmount = 465000;

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `form ${formPurchaseInvoice.number} order more than available, available 220000 ordered 500000`
        })
      })
      .end(done);
  });

  it('throw error if purchase down payment order more than available', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    const { formPurchaseDownPayment } = recordFactories;
    updateFormRequestDto.downPayments[0].amount = 40000;
    updateFormRequestDto.totalDownPaymentAmount = 40000;
    updateFormRequestDto.totalAmount = 45000;

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `form ${formPurchaseDownPayment.number} order more than available, available 30000 ordered 40000`
        })
      })
      .end(done);
  });

  it('throw error if purchase return order more than available', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    const { formPurchaseReturn } = recordFactories;
    updateFormRequestDto.returns[0].amount = 20000;
    updateFormRequestDto.totalReturnAmount = 20000;
    updateFormRequestDto.totalAmount = 55000;

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `form ${formPurchaseReturn.number} order more than available, available 11000 ordered 20000`
        })
      })
      .end(done);
  });

  it('throw error if notes more than 255 character', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    updateFormRequestDto.notes = faker.datatype.string(300)

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
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
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    updateFormRequestDto.notes = ' example notes ';

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.CREATED);
        expect(res.body.data.form).toMatchObject({
          notes: 'example notes',
        })
      })
      .end(done);
  });

  it('throw error on incorrect total invoice', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    updateFormRequestDto.totalInvoiceAmount = 400000

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `incorect total invoice amount, expected 100000 received 400000`
        })
      })
      .end(done);
  });

  it('throw error on incorrect total down payment', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    updateFormRequestDto.totalDownPaymentAmount = 400000

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `incorect total down payment amount, expected 20000 received 400000`
        })
      })
      .end(done);
  });

  it('throw error on incorrect total return', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    updateFormRequestDto.totalReturnAmount = 400000

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `incorect total return amount, expected 10000 received 400000`
        })
      })
      .end(done);
  });

  it('throw error on incorrect total other', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    updateFormRequestDto.totalOtherAmount = 400000
    
    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `incorect total other amount, expected 5000 received 400000`
        })
      })
      .end(done);
  });

  it('throw error on incorrect total amount', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    updateFormRequestDto.totalAmount = 3000000

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `incorect total amount, expected 65000 received 3000000`
        })
      })
      .end(done);
  });

  it('throw error on total down payment more than total invoice', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    updateFormRequestDto.invoices[0].amount = 10000
    updateFormRequestDto.totalInvoiceAmount = 10000
    
    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `total down payment more than total invoice, total down payment: 20000 > total invoice: 10000`
        })
      })
      .end(done);
  });

  it('throw error on total return more than total invoice', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    const { purchaseReturn } = recordFactories;
    await purchaseReturn.update({
      amount: 110000,
    }); 
    updateFormRequestDto.returns[0].amount = 110000
    updateFormRequestDto.totalReturnAmount = 110000

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `total return more than total invoice, total return: 110000 > total invoice: 100000`
        })
      })
      .end(done);
  });

  it('throw error when setting journal is missing', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    const { settingJournal } = recordFactories;
    await settingJournal.destroy();

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.status).toEqual(httpStatus.UNPROCESSABLE_ENTITY);
        expect(res.body).toMatchObject({
          message: `Journal purchase account - account payable not found`
        })
      })
      .end(done);
  });

  it('throw error if form number already in database', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    const { maker, approver } = recordFactories;
    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect(async (res) => {
        expect(res.status).toEqual(httpStatus.CREATED);
        const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne({
          where: { id: res.body.data.id }
        });
        const paymentOrderForm = await paymentOrder.getForm();

        // check if use existing form number it will throw
        await expect(async () => {
          await factory.form.create({
            branch,
            number: paymentOrderForm.number,
            formable: paymentOrder,
            formableType: 'PaymentOrder',
            createdBy: maker.id,
            updatedBy: maker.id,
            requestApprovalTo: approver.id,
          });
        }).rejects.toThrow();
      })
      .end(done);
  });

  it('check saved data same with data sent', async () => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    const oldForm = await paymentOrder.getForm();
    const { branch, maker, approver } = recordFactories;
    const mailerSpy = jest.spyOn(ProcessSendCreateApproval.prototype, 'call').mockReturnValue(true);

    await request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect(async (res) => {
        expect(res.status).toEqual(httpStatus.CREATED);
        expect(mailerSpy).toHaveBeenCalled();
        expect(res.body.data).toMatchObject({
          id: expect.any(Number),
          paymentType: updateFormRequestDto.paymentType,
          supplierId: updateFormRequestDto.supplierId,
          supplierName: updateFormRequestDto.supplierName,
          amount: updateFormRequestDto.totalAmount,
          invoices: [
            {
              id: expect.any(Number),
              purchasePaymentOrderId: res.body.data.id,
              amount: updateFormRequestDto.invoices[0].amount,
              referenceableId: updateFormRequestDto.invoices[0].id,
              referenceableType: 'PurchaseInvoice'
            }
          ],
          downPayments: [
            {
              id: expect.any(Number),
              purchasePaymentOrderId: res.body.data.id,
              amount: updateFormRequestDto.downPayments[0].amount,
              referenceableId: updateFormRequestDto.downPayments[0].id,
              referenceableType: 'PurchaseDownPayment'
            }
          ],
          returns: [
            {
              id: expect.any(Number),
              purchasePaymentOrderId: res.body.data.id,
              amount: updateFormRequestDto.returns[0].amount,
              referenceableId: updateFormRequestDto.returns[0].id,
              referenceableType: 'PurchaseReturn'
            }
          ],
          others: [
            {
              id: expect.any(Number),
              purchasePaymentOrderId: res.body.data.id,
              chartOfAccountId: updateFormRequestDto.others[0].coaId,
              allocationId: updateFormRequestDto.others[0].allocationId,
              amount: updateFormRequestDto.others[0].amount,
              notes: updateFormRequestDto.others[0].notes,
            },
            {
              id: expect.any(Number),
              purchasePaymentOrderId: res.body.data.id,
              chartOfAccountId: updateFormRequestDto.others[1].coaId,
              allocationId: updateFormRequestDto.others[1].allocationId,
              amount: updateFormRequestDto.others[1].amount,
              notes: updateFormRequestDto.others[1].notes,
            }
          ],
          form: {
            done: false,
            approvalStatus: 0,
            id: expect.any(Number),
            branchId: branch.id,
            date: updateFormRequestDto.date.toISOString(),
            number: oldForm.number,
            notes: updateFormRequestDto.notes,
            createdBy: maker.id,
            updatedBy: maker.id,
            incrementNumber: 1,
            incrementGroup: 202212,
            formableId: res.body.data.id,
            formableType: 'PurchasePaymentOrder',
            requestApprovalTo: approver.id,
          }
        });

        const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne({
          where: { id: res.body.data.id }
        });
        expect(paymentOrder).toMatchObject({
          id: res.body.data.id,
          paymentType: updateFormRequestDto.paymentType,
          supplierId: updateFormRequestDto.supplierId,
          supplierName: updateFormRequestDto.supplierName,
          amount: updateFormRequestDto.totalAmount + '.000000000000000000000000000000',
        });

        const paymentOrderForm = await tenantDatabase.Form.findOne({
          where: { id: res.body.data.form.id }
        });
        expect(paymentOrderForm).toMatchObject({
          done: false,
          approvalStatus: 0,
          id: res.body.data.form.id,
          BranchId: branch.id,
          date: updateFormRequestDto.date,
          number: 'PP2212001',
          notes: updateFormRequestDto.notes,
          createdBy: maker.id,
          updatedBy: maker.id,
          incrementNumber: 1,
          incrementGroup: 202212,
          formableId: res.body.data.id,
          formableType: 'PurchasePaymentOrder',
          requestApprovalTo: approver.id,
        });

        const invoice = await tenantDatabase.PurchasePaymentOrderDetails.findOne({
          where: { id: res.body.data.invoices[0].id }
        });
        expect(invoice).toMatchObject({
          id: res.body.data.invoices[0].id,
          purchasePaymentOrderId: res.body.data.id,
          amount: updateFormRequestDto.invoices[0].amount + '.000000000000000000000000000000',
          referenceableId: updateFormRequestDto.invoices[0].id,
          referenceableType: 'PurchaseInvoice'
        });

        const downPayment = await tenantDatabase.PurchasePaymentOrderDetails.findOne({
          where: { id: res.body.data.downPayments[0].id }
        });
        expect(downPayment).toMatchObject({
          id: res.body.data.downPayments[0].id,
          purchasePaymentOrderId: res.body.data.id,
          amount: updateFormRequestDto.downPayments[0].amount + '.000000000000000000000000000000',
          referenceableId: updateFormRequestDto.downPayments[0].id,
          referenceableType: 'PurchaseDownPayment'
        });

        const pReturn = await tenantDatabase.PurchasePaymentOrderDetails.findOne({
          where: { id: res.body.data.returns[0].id }
        });
        expect(pReturn).toMatchObject({
          id: res.body.data.returns[0].id,
          purchasePaymentOrderId: res.body.data.id,
          amount: updateFormRequestDto.returns[0].amount + '.000000000000000000000000000000',
          referenceableId: updateFormRequestDto.returns[0].id,
          referenceableType: 'PurchaseReturn'
        });

        let other = await tenantDatabase.PurchasePaymentOrderDetails.findOne({
          where: { id: res.body.data.others[0].id }
        });
        expect(other).toMatchObject({
          id: res.body.data.others[0].id,
          purchasePaymentOrderId: res.body.data.id,
          chartOfAccountId: updateFormRequestDto.others[0].coaId,
          allocationId: updateFormRequestDto.others[0].allocationId,
          amount: updateFormRequestDto.others[0].amount + '.000000000000000000000000000000',
          notes: updateFormRequestDto.others[0].notes,
        });

        other = await tenantDatabase.PurchasePaymentOrderDetails.findOne({
          where: { id: res.body.data.others[1].id }
        });
        expect(other).toMatchObject({
          id: res.body.data.others[1].id,
          purchasePaymentOrderId: res.body.data.id,
          chartOfAccountId: updateFormRequestDto.others[1].coaId,
          allocationId: updateFormRequestDto.others[1].allocationId,
          amount: updateFormRequestDto.others[1].amount + '.000000000000000000000000000000',
          notes: updateFormRequestDto.others[1].notes,
        });

        await oldForm.reload();
        expect(oldForm.number).toBe(null);
        expect(oldForm.editedNumber).toBe(res.body.data.form.number);

        const archive = await tenantDatabase.UserActivity.findOne({
          where: {
            number: oldForm.editedNumber,
            activity: 'Update - 1',
          }
        })
        expect(archive).toBeDefined();
      });
  });

  it('check journal balance', async () => {
    const { totalAmount, invoices, downPayments, returns, others } = updateFormRequestDto;
    const { isBalance, debit, credit } = await new CheckJournal(tenantDatabase, {
      amount: totalAmount, invoices, downPayments, returns, others
    }).call();

    expect(isBalance).toEqual(true);
    expect(debit).toEqual(credit);
  });

  it('check payment order not available to cash out / bank out', async () => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();

    await request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect(async () => {
        await request(app)
          .get('/v1/purchase/payment-order?filter_form=pending;approvalApproved')
          .set('Authorization', 'Bearer '+ jwtoken)
          .set('Tenant', 'test_dev')
          .set('Content-Type', 'application/json')
          .expect('Content-Type', /json/)
          .expect(async (res) => {
            expect(res.status).toEqual(httpStatus.OK);
            expect(res.body.data.length).toEqual(0);
          });
      });
  });

  it('check form reference still pending if amount less than available', async (done) => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    const { purchaseInvoice, purchaseDownPayment, purchaseReturn } = recordFactories;

    const availableInvoice = (await purchaseInvoice.getAvailable()) + createFormRequestDto.invoices[0].amount;
    expect(availableInvoice).toBeGreaterThan(parseFloat(updateFormRequestDto.invoices[0].amount));

    const availableDownPayment = (await purchaseDownPayment.getAvailable()) + createFormRequestDto.downPayments[0].amount;
    expect(availableDownPayment).toBeGreaterThan(parseFloat(updateFormRequestDto.downPayments[0].amount));

    const availableReturn = (await purchaseReturn.getAvailable()) + createFormRequestDto.returns[0].amount;
    expect(availableReturn).toBeGreaterThan(parseFloat(updateFormRequestDto.returns[0].amount));

    request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect(async (res) => {
        const formInvoice = await purchaseInvoice.getForm();
        expect(formInvoice.done).toEqual(false);

        const formDownPayment = await purchaseDownPayment.getForm();        
        expect(formDownPayment.done).toEqual(false);
        
        const formReturn = await purchaseReturn.getForm();        
        expect(formReturn.done).toEqual(false); 
      })
      .end(done);
  });

  it('check form reference done if amount same as available', async () => {
    const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
    updateFormRequestDto.invoices[0].amount = 220000;
    updateFormRequestDto.totalInvoiceAmount = 220000;
    updateFormRequestDto.downPayments[0].amount = 30000;
    updateFormRequestDto.totalDownPaymentAmount = 30000;
    updateFormRequestDto.returns[0].amount = 11000;
    updateFormRequestDto.totalReturnAmount = 11000;
    updateFormRequestDto.totalAmount = 174000;

    const { purchaseInvoice, purchaseDownPayment, purchaseReturn } = recordFactories;

    const availableInvoice = (await purchaseInvoice.getAvailable()) + createFormRequestDto.invoices[0].amount;
    expect(availableInvoice).toEqual(parseFloat(updateFormRequestDto.invoices[0].amount));

    const availableDownPayment = (await purchaseDownPayment.getAvailable()) + createFormRequestDto.downPayments[0].amount;
    expect(availableDownPayment).toEqual(parseFloat(updateFormRequestDto.downPayments[0].amount));

    const availableReturn = (await purchaseReturn.getAvailable()) + createFormRequestDto.returns[0].amount;
    expect(availableReturn).toEqual(parseFloat(updateFormRequestDto.returns[0].amount));

    await request(app)
      .patch('/v1/purchase/payment-order/' + paymentOrder.id)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(updateFormRequestDto)
      .expect('Content-Type', /json/)
      .expect(async () => {
        const formInvoice = await purchaseInvoice.getForm();
        expect(formInvoice.done).toEqual(true);

        const formDownPayment = await purchaseDownPayment.getForm();
        expect(formDownPayment.done).toEqual(true);
        
        const formReturn = await purchaseReturn.getForm();
        expect(formReturn.done).toEqual(true);
      });
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

const generateUpdateFormRequestDto = (recordFactories) => {
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