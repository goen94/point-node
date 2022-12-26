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

    it('return all data if approval status filter is empty', async () => {
      const pendingPaymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
  
      const res = await request(app)
        .post('/v1/purchase/payment-order')
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(createFormRequestDto);
      
      const approvedPaymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne({
        where: { id: res.body.data.id }
      });
      const formApprovedPaymentOrder = await approvedPaymentOrder.getForm();
      await formApprovedPaymentOrder.update({
        approvalStatus: 1
      });
  
      await request(app)
        .get('/v1/purchase/payment-order')
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .expect('Content-Type', /json/)
        .expect(async (res) => {
          const invoices = await pendingPaymentOrder.getInvoices();
          const downPayments = await pendingPaymentOrder.getDownPayments();
          const returns = await pendingPaymentOrder.getReturns();
          const others = await pendingPaymentOrder.getOthers();
          const form = await pendingPaymentOrder.getForm();
          const supplier = await pendingPaymentOrder.getSupplier();
  
          const invoicesApproved = await approvedPaymentOrder.getInvoices();
          const downPaymentsApproved = await approvedPaymentOrder.getDownPayments();
          const returnsApproved = await approvedPaymentOrder.getReturns();
          const othersApproved = await approvedPaymentOrder.getOthers();
          const supplierApproved = await approvedPaymentOrder.getSupplier();
  
          expect(res.status).toEqual(httpStatus.OK);
          expect(res.body).toMatchObject({
            data: expect.any(Array),
            meta: {
              currentPage: expect.any(Number),
              lastPage: expect.any(Number),
              perPage: 10,
              total: 2
            }
          });
          expect(res.body.data).toMatchObject([
            {
              id: pendingPaymentOrder.id,
              paymentType: pendingPaymentOrder.paymentType,
              supplierId: pendingPaymentOrder.supplierId,
              supplierName: pendingPaymentOrder.supplierName,
              amount: pendingPaymentOrder.amount,
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
              invoices: [
                {
                  id: invoices[0].id,
                  purchasePaymentOrderId: pendingPaymentOrder.id,
                  amount: invoices[0].amount,
                  referenceableId: invoices[0].referenceableId,
                  referenceableType: invoices[0].referenceableType
                }
              ],
              downPayments: [
                {
                  id: downPayments[0].id,
                  purchasePaymentOrderId: pendingPaymentOrder.id,
                  amount: downPayments[0].amount,
                  referenceableId: downPayments[0].referenceableId,
                  referenceableType: downPayments[0].referenceableType
                }
              ],
              returns: [
                {
                  id: returns[0].id,
                  purchasePaymentOrderId: pendingPaymentOrder.id,
                  amount: returns[0].amount,
                  referenceableId: returns[0].referenceableId,
                  referenceableType: returns[0].referenceableType
                }
              ],
              others: [
                {
                  id: others[0].id,
                  purchasePaymentOrderId: pendingPaymentOrder.id,
                  chartOfAccountId: others[0].coaId,
                  allocationId: others[0].allocationId,
                  amount: others[0].amount,
                  notes: others[0].notes
                },
                {
                  id: others[1].id,
                  purchasePaymentOrderId: pendingPaymentOrder.id,
                  chartOfAccountId: others[1].coaId,
                  allocationId: others[1].allocationId,
                  amount: others[1].amount,
                  notes: others[1].notes
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
                approvalBy: approver.id,
                approvalAt: form.approvalAt.toISOString(),
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
              }
            },
            {
              id: approvedPaymentOrder.id,
              paymentType: approvedPaymentOrder.paymentType,
              supplierId: approvedPaymentOrder.supplierId,
              supplierName: approvedPaymentOrder.supplierName,
              amount: approvedPaymentOrder.amount,
              supplier: {
                id: supplierApproved.id,
                code: supplierApproved.code,
                name: supplierApproved.name,
                address: supplierApproved.address,
                city: supplierApproved.city,
                state: supplierApproved.state,
                country: supplierApproved.country,
                phone: supplierApproved.phone,
                email: supplierApproved.email
              },
              invoices: [
                {
                  id: invoicesApproved[0].id,
                  purchasePaymentOrderId: approvedPaymentOrder.id,
                  amount: invoicesApproved[0].amount,
                  referenceableId: invoicesApproved[0].referenceableId,
                  referenceableType: invoicesApproved[0].referenceableType
                }
              ],
              downPayments: [
                {
                  id: downPaymentsApproved[0].id,
                  purchasePaymentOrderId: approvedPaymentOrder.id,
                  amount: downPaymentsApproved[0].amount,
                  referenceableId: downPaymentsApproved[0].referenceableId,
                  referenceableType: downPaymentsApproved[0].referenceableType
                }
              ],
              returns: [
                {
                  id: returnsApproved[0].id,
                  purchasePaymentOrderId: approvedPaymentOrder.id,
                  amount: returnsApproved[0].amount,
                  referenceableId: returnsApproved[0].referenceableId,
                  referenceableType: returnsApproved[0].referenceableType
                }
              ],
              others: [
                {
                  id: othersApproved[0].id,
                  purchasePaymentOrderId: approvedPaymentOrder.id,
                  chartOfAccountId: othersApproved[0].coaId,
                  allocationId: othersApproved[0].allocationId,
                  amount: othersApproved[0].amount,
                  notes: othersApproved[0].notes
                },
                {
                  id: othersApproved[1].id,
                  purchasePaymentOrderId: approvedPaymentOrder.id,
                  chartOfAccountId: othersApproved[1].coaId,
                  allocationId: othersApproved[1].allocationId,
                  amount: othersApproved[1].amount,
                  notes: othersApproved[1].notes
                }
              ],
              form: {
                id: formApprovedPaymentOrder.id,
                branchId: formApprovedPaymentOrder.branchId,
                date: formApprovedPaymentOrder.date.toISOString(),
                number: formApprovedPaymentOrder.number,
                editedNumber: formApprovedPaymentOrder.editedNumber,
                notes: formApprovedPaymentOrder.notes,
                editedNotes: formApprovedPaymentOrder.editedNotes,
                createdBy: formApprovedPaymentOrder.createdBy,
                updatedBy: formApprovedPaymentOrder.updatedBy,
                done: formApprovedPaymentOrder.done,
                incrementNumber: formApprovedPaymentOrder.incrementNumber,
                incrementGroup: formApprovedPaymentOrder.incrementGroup,
                formableId: formApprovedPaymentOrder.formableId,
                formableType: formApprovedPaymentOrder.formableType,
                requestApprovalTo: formApprovedPaymentOrder.requestApprovalTo,
                approvalBy: formApprovedPaymentOrder.approvalBy,
                approvalAt: formApprovedPaymentOrder.approvalAt.toISOString(),
                approvalReason: formApprovedPaymentOrder.approvalReason,
                approvalStatus: formApprovedPaymentOrder.approvalStatus,
                requestCancellationTo: formApprovedPaymentOrder.requestCancellationTo,
                requestCancellationBy: formApprovedPaymentOrder.requestCancellationBy,
                requestCancellationAt: formApprovedPaymentOrder.requestCancellationAt,
                requestCancellationReason: formApprovedPaymentOrder.requestCancellationReason,
                cancellationApprovalAt: formApprovedPaymentOrder.cancellationApprovalAt,
                cancellationApprovalBy: formApprovedPaymentOrder.cancellationApprovalBy,
                cancellationApprovalReason: formApprovedPaymentOrder.cancellationApprovalReason,
                cancellationStatus: formApprovedPaymentOrder.cancellationStatus,
              }
            }
          ]);
        });      
    });

    it('return all data if form status filter is empty', async () => {
      const pendingPaymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
  
      const res = await request(app)
        .post('/v1/purchase/payment-order')
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(createFormRequestDto);
      
      const donePaymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne({
        where: { id: res.body.data.id }
      });
      const formDonePaymentOrder = await donePaymentOrder.getForm();
      await formDonePaymentOrder.update({
        done: true
      });
  
      await request(app)
        .get('/v1/purchase/payment-order')
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .expect('Content-Type', /json/)
        .expect(async (res) => {
          const invoices = await pendingPaymentOrder.getInvoices();
          const downPayments = await pendingPaymentOrder.getDownPayments();
          const returns = await pendingPaymentOrder.getReturns();
          const others = await pendingPaymentOrder.getOthers();
          const form = await pendingPaymentOrder.getForm();
          const supplier = await pendingPaymentOrder.getSupplier();
  
          const invoicesDone = await donePaymentOrder.getInvoices();
          const downPaymentsDone = await donePaymentOrder.getDownPayments();
          const returnsDone = await donePaymentOrder.getReturns();
          const othersDone = await donePaymentOrder.getOthers();
          const supplierDone = await donePaymentOrder.getSupplier();
  
          expect(res.status).toEqual(httpStatus.OK);
          expect(res.body).toMatchObject({
            data: expect.any(Array),
            meta: {
              currentPage: expect.any(Number),
              lastPage: expect.any(Number),
              perPage: 10,
              total: 2
            }
          });
          expect(res.body.data).toMatchObject([
            {
              id: pendingPaymentOrder.id,
              paymentType: pendingPaymentOrder.paymentType,
              supplierId: pendingPaymentOrder.supplierId,
              supplierName: pendingPaymentOrder.supplierName,
              amount: pendingPaymentOrder.amount,
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
              invoices: [
                {
                  id: invoices[0].id,
                  purchasePaymentOrderId: pendingPaymentOrder.id,
                  amount: invoices[0].amount,
                  referenceableId: invoices[0].referenceableId,
                  referenceableType: invoices[0].referenceableType
                }
              ],
              downPayments: [
                {
                  id: downPayments[0].id,
                  purchasePaymentOrderId: pendingPaymentOrder.id,
                  amount: downPayments[0].amount,
                  referenceableId: downPayments[0].referenceableId,
                  referenceableType: downPayments[0].referenceableType
                }
              ],
              returns: [
                {
                  id: returns[0].id,
                  purchasePaymentOrderId: pendingPaymentOrder.id,
                  amount: returns[0].amount,
                  referenceableId: returns[0].referenceableId,
                  referenceableType: returns[0].referenceableType
                }
              ],
              others: [
                {
                  id: others[0].id,
                  purchasePaymentOrderId: pendingPaymentOrder.id,
                  chartOfAccountId: others[0].coaId,
                  allocationId: others[0].allocationId,
                  amount: others[0].amount,
                  notes: others[0].notes
                },
                {
                  id: others[1].id,
                  purchasePaymentOrderId: pendingPaymentOrder.id,
                  chartOfAccountId: others[1].coaId,
                  allocationId: others[1].allocationId,
                  amount: others[1].amount,
                  notes: others[1].notes
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
                approvalBy: approver.id,
                approvalAt: form.approvalAt.toISOString(),
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
              }
            },
            {
              id: pendingPaymentOrder.id,
              paymentType: pendingPaymentOrder.paymentType,
              supplierId: pendingPaymentOrder.supplierId,
              supplierName: pendingPaymentOrder.supplierName,
              amount: pendingPaymentOrder.amount,
              supplier: {
                id: supplierDone.id,
                code: supplierDone.code,
                name: supplierDone.name,
                address: supplierDone.address,
                city: supplierDone.city,
                state: supplierDone.state,
                country: supplierDone.country,
                phone: supplierDone.phone,
                email: supplierDone.email
              },
              invoices: [
                {
                  id: invoicesDone[0].id,
                  purchasePaymentOrderId: pendingPaymentOrder.id,
                  amount: invoicesDone[0].amount,
                  referenceableId: invoicesDone[0].referenceableId,
                  referenceableType: invoicesDone[0].referenceableType
                }
              ],
              downPayments: [
                {
                  id: downPaymentsDone[0].id,
                  purchasePaymentOrderId: pendingPaymentOrder.id,
                  amount: downPaymentsDone[0].amount,
                  referenceableId: downPaymentsDone[0].referenceableId,
                  referenceableType: downPaymentsDone[0].referenceableType
                }
              ],
              returns: [
                {
                  id: returnsDone[0].id,
                  purchasePaymentOrderId: pendingPaymentOrder.id,
                  amount: returnsDone[0].amount,
                  referenceableId: returnsDone[0].referenceableId,
                  referenceableType: returnsDone[0].referenceableType
                }
              ],
              others: [
                {
                  id: othersDone[0].id,
                  purchasePaymentOrderId: pendingPaymentOrder.id,
                  chartOfAccountId: othersDone[0].coaId,
                  allocationId: othersDone[0].allocationId,
                  amount: othersDone[0].amount,
                  notes: othersDone[0].notes
                },
                {
                  id: othersDone[1].id,
                  purchasePaymentOrderId: pendingPaymentOrder.id,
                  chartOfAccountId: othersDone[1].coaId,
                  allocationId: othersDone[1].allocationId,
                  amount: othersDone[1].amount,
                  notes: othersDone[1].notes
                }
              ],
              form: {
                id: formDonePaymentOrder.id,
                branchId: formDonePaymentOrder.branchId,
                date: formDonePaymentOrder.date.toISOString(),
                number: formDonePaymentOrder.number,
                editedNumber: formDonePaymentOrder.editedNumber,
                notes: formDonePaymentOrder.notes,
                editedNotes: formDonePaymentOrder.editedNotes,
                createdBy: formDonePaymentOrder.createdBy,
                updatedBy: formDonePaymentOrder.updatedBy,
                done: formDonePaymentOrder.done,
                incrementNumber: formDonePaymentOrder.incrementNumber,
                incrementGroup: formDonePaymentOrder.incrementGroup,
                formableId: formDonePaymentOrder.formableId,
                formableType: formDonePaymentOrder.formableType,
                requestApprovalTo: formDonePaymentOrder.requestApprovalTo,
                approvalBy: formDonePaymentOrder.approvalBy,
                approvalAt: formDonePaymentOrder.approvalAt.toISOString(),
                approvalReason: formDonePaymentOrder.approvalReason,
                approvalStatus: formDonePaymentOrder.approvalStatus,
                requestCancellationTo: formDonePaymentOrder.requestCancellationTo,
                requestCancellationBy: formDonePaymentOrder.requestCancellationBy,
                requestCancellationAt: formDonePaymentOrder.requestCancellationAt,
                requestCancellationReason: formDonePaymentOrder.requestCancellationReason,
                cancellationApprovalAt: formDonePaymentOrder.cancellationApprovalAt,
                cancellationApprovalBy: formDonePaymentOrder.cancellationApprovalBy,
                cancellationApprovalReason: formDonePaymentOrder.cancellationApprovalReason,
                cancellationStatus: formDonePaymentOrder.cancellationStatus,
              }
            }
          ]);
        });      
    });

    it('return current month data if date filter is empty', async () => {
      const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne();
  
      createFormRequestDto.date = new Date('2022-11-01');
      await request(app)
        .post('/v1/purchase/payment-order')
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(createFormRequestDto);
  
      await request(app)
        .get('/v1/purchase/payment-order')
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .expect('Content-Type', /json/)
        .expect(async (res) => {
          const invoices = await paymentOrder.getInvoices();
          const downPayments = await paymentOrder.getDownPayments();
          const returns = await paymentOrder.getReturns();
          const others = await paymentOrder.getOthers();
          const form = await paymentOrder.getForm();
          const supplier = await paymentOrder.getSupplier();
  
          expect(res.status).toEqual(httpStatus.OK);
          expect(res.body).toMatchObject({
            data: expect.any(Array),
            meta: {
              currentPage: expect.any(Number),
              lastPage: expect.any(Number),
              perPage: 10,
              total: 1
            }
          });
          expect(res.body.data[0]).toMatchObject({
            id: paymentOrder.id,
            paymentType: paymentOrder.paymentType,
            supplierId: paymentOrder.supplierId,
            supplierName: paymentOrder.supplierName,
            amount: paymentOrder.amount,
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
            invoices: [
              {
                id: invoices[0].id,
                purchasePaymentOrderId: paymentOrder.id,
                amount: invoices[0].amount,
                referenceableId: invoices[0].referenceableId,
                referenceableType: invoices[0].referenceableType
              }
            ],
            downPayments: [
              {
                id: downPayments[0].id,
                purchasePaymentOrderId: paymentOrder.id,
                amount: downPayments[0].amount,
                referenceableId: downPayments[0].referenceableId,
                referenceableType: downPayments[0].referenceableType
              }
            ],
            returns: [
              {
                id: returns[0].id,
                purchasePaymentOrderId: paymentOrder.id,
                amount: returns[0].amount,
                referenceableId: returns[0].referenceableId,
                referenceableType: returns[0].referenceableType
              }
            ],
            others: [
              {
                id: others[0].id,
                purchasePaymentOrderId: paymentOrder.id,
                chartOfAccountId: others[0].coaId,
                allocationId: others[0].allocationId,
                amount: others[0].amount,
                notes: others[0].notes
              },
              {
                id: others[1].id,
                purchasePaymentOrderId: paymentOrder.id,
                chartOfAccountId: others[1].coaId,
                allocationId: others[1].allocationId,
                amount: others[1].amount,
                notes: others[1].notes
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
              approvalAt: form.approvalAt.toISOString(),
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
            },
          })
        });
    });

    it('return form with status approved', async () => {
      const res = await request(app)
        .post('/v1/purchase/payment-order')
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(createFormRequestDto);
      
      const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne({
        where: { id: res.body.data.id }
      });
      const form = await paymentOrder.getForm();
      await form.update({
        approvalStatus: 1
      });
  
      const queries = 'filter_approval=approved'
  
      await request(app)
        .get('/v1/purchase/payment-order?' + queries)
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .expect('Content-Type', /json/)
        .expect(async (res) => {
          const invoices = await paymentOrder.getInvoices();
          const downPayments = await paymentOrder.getDownPayments();
          const returns = await paymentOrder.getReturns();
          const others = await paymentOrder.getOthers();
          const form = await paymentOrder.getForm();
          const supplier = await paymentOrder.getSupplier();
  
          expect(res.status).toEqual(httpStatus.OK);
          expect(res.body).toMatchObject({
            data: expect.any(Array),
            meta: {
              currentPage: expect.any(Number),
              lastPage: expect.any(Number),
              perPage: 10,
              total: 1
            }
          });
          expect(res.body.data).toMatchObject([{
            id: paymentOrder.id,
            paymentType: paymentOrder.paymentType,
            supplierId: paymentOrder.supplierId,
            supplierName: paymentOrder.supplierName,
            amount: paymentOrder.amount,
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
            invoices: [
              {
                id: invoices[0].id,
                purchasePaymentOrderId: paymentOrder.id,
                amount: invoices[0].amount,
                referenceableId: invoices[0].referenceableId,
                referenceableType: invoices[0].referenceableType
              }
            ],
            downPayments: [
              {
                id: downPayments[0].id,
                purchasePaymentOrderId: paymentOrder.id,
                amount: downPayments[0].amount,
                referenceableId: downPayments[0].referenceableId,
                referenceableType: downPayments[0].referenceableType
              }
            ],
            returns: [
              {
                id: returns[0].id,
                purchasePaymentOrderId: paymentOrder.id,
                amount: returns[0].amount,
                referenceableId: returns[0].referenceableId,
                referenceableType: returns[0].referenceableType
              }
            ],
            others: [
              {
                id: others[0].id,
                purchasePaymentOrderId: paymentOrder.id,
                chartOfAccountId: others[0].coaId,
                allocationId: others[0].allocationId,
                amount: others[0].amount,
                notes: others[0].notes
              },
              {
                id: others[1].id,
                purchasePaymentOrderId: paymentOrder.id,
                chartOfAccountId: others[1].coaId,
                allocationId: others[1].allocationId,
                amount: others[1].amount,
                notes: others[1].notes
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
              approvalAt: form.approvalAt.toISOString(),
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
            }
          }]);
        });
    });

    it('return form with status done', async () => {
      const res = await request(app)
        .post('/v1/purchase/payment-order')
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(createFormRequestDto);
      
      const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne({
        where: { id: res.body.data.id }
      });
      const form = await paymentOrder.getForm();
      await form.update({
        done: true
      });
  
      const queries = 'filter_form=done'
  
      await request(app)
        .get('/v1/purchase/payment-order?' + queries)
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .expect('Content-Type', /json/)
        .expect(async (res) => {
          const invoices = await paymentOrder.getInvoices();
          const downPayments = await paymentOrder.getDownPayments();
          const returns = await paymentOrder.getReturns();
          const others = await paymentOrder.getOthers();
          const form = await paymentOrder.getForm();
          const supplier = await paymentOrder.getSupplier();
  
          expect(res.status).toEqual(httpStatus.OK);
          expect(res.body).toMatchObject({
            data: expect.any(Array),
            meta: {
              currentPage: expect.any(Number),
              lastPage: expect.any(Number),
              perPage: 10,
              total: 1
            }
          });
          expect(res.body.data).toMatchObject([{
            id: paymentOrder.id,
            paymentType: paymentOrder.paymentType,
            supplierId: paymentOrder.supplierId,
            supplierName: paymentOrder.supplierName,
            amount: paymentOrder.amount,
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
            invoices: [
              {
                id: invoices[0].id,
                purchasePaymentOrderId: paymentOrder.id,
                amount: invoices[0].amount,
                referenceableId: invoices[0].referenceableId,
                referenceableType: invoices[0].referenceableType
              }
            ],
            downPayments: [
              {
                id: downPayments[0].id,
                purchasePaymentOrderId: paymentOrder.id,
                amount: downPayments[0].amount,
                referenceableId: downPayments[0].referenceableId,
                referenceableType: downPayments[0].referenceableType
              }
            ],
            returns: [
              {
                id: returns[0].id,
                purchasePaymentOrderId: paymentOrder.id,
                amount: returns[0].amount,
                referenceableId: returns[0].referenceableId,
                referenceableType: returns[0].referenceableType
              }
            ],
            others: [
              {
                id: others[0].id,
                purchasePaymentOrderId: paymentOrder.id,
                chartOfAccountId: others[0].coaId,
                allocationId: others[0].allocationId,
                amount: others[0].amount,
                notes: others[0].notes
              },
              {
                id: others[1].id,
                purchasePaymentOrderId: paymentOrder.id,
                chartOfAccountId: others[1].coaId,
                allocationId: others[1].allocationId,
                amount: others[1].amount,
                notes: others[1].notes
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
              approvalAt: form.approvalAt.toISOString(),
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
            }
          }]);
        });
    });

    it('return form with filter date', async () => {
      createFormRequestDto.date = new Date('2022-11-01');
      const res = await request(app)
        .post('/v1/purchase/payment-order')
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .set('Content-Type', 'application/json')
        .send(createFormRequestDto);
      
      const paymentOrder = await tenantDatabase.PurchasePaymentOrder.findOne({
        where: { id: res.body.data.id }
      });
      const form = await paymentOrder.getForm();
      await form.update({
        done: true
      });
  
      const queries = 'filter_date_min=2022-11-01+00:00:00&filter_date_max=2022-11-30+23:59:59'
  
      await request(app)
        .get('/v1/purchase/payment-order?' + queries)
        .set('Authorization', 'Bearer '+ jwtoken)
        .set('Tenant', 'test_dev')
        .expect('Content-Type', /json/)
        .expect(async (res) => {
          const invoices = await paymentOrder.getInvoices();
          const downPayments = await paymentOrder.getDownPayments();
          const returns = await paymentOrder.getReturns();
          const others = await paymentOrder.getOthers();
          const form = await paymentOrder.getForm();
          const supplier = await paymentOrder.getSupplier();
  
          expect(res.status).toEqual(httpStatus.OK);
          expect(res.body).toMatchObject({
            data: expect.any(Array),
            meta: {
              currentPage: expect.any(Number),
              lastPage: expect.any(Number),
              perPage: 10,
              total: 1
            }
          });
          expect(res.body.data).toMatchObject([{
            id: paymentOrder.id,
            paymentType: paymentOrder.paymentType,
            supplierId: paymentOrder.supplierId,
            supplierName: paymentOrder.supplierName,
            amount: paymentOrder.amount,
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
            invoices: [
              {
                id: invoices[0].id,
                purchasePaymentOrderId: paymentOrder.id,
                amount: invoices[0].amount,
                referenceableId: invoices[0].referenceableId,
                referenceableType: invoices[0].referenceableType
              }
            ],
            downPayments: [
              {
                id: downPayments[0].id,
                purchasePaymentOrderId: paymentOrder.id,
                amount: downPayments[0].amount,
                referenceableId: downPayments[0].referenceableId,
                referenceableType: downPayments[0].referenceableType
              }
            ],
            returns: [
              {
                id: returns[0].id,
                purchasePaymentOrderId: paymentOrder.id,
                amount: returns[0].amount,
                referenceableId: returns[0].referenceableId,
                referenceableType: returns[0].referenceableType
              }
            ],
            others: [
              {
                id: others[0].id,
                purchasePaymentOrderId: paymentOrder.id,
                chartOfAccountId: others[0].coaId,
                allocationId: others[0].allocationId,
                amount: others[0].amount,
                notes: others[0].notes
              },
              {
                id: others[1].id,
                purchasePaymentOrderId: paymentOrder.id,
                chartOfAccountId: others[1].coaId,
                allocationId: others[1].allocationId,
                amount: others[1].amount,
                notes: others[1].notes
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
              approvalAt: form.approvalAt.toISOString(),
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
            }
          }]);
        });
    });
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