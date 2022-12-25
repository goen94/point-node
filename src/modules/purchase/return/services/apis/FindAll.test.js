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

describe('Purcahse Return - FindAll', () => {
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

  it('return all data if approval status filter is empty', async () => {
    const pendingPurchaseReturn = await tenantDatabase.PurchaseReturn.findOne();

    const res = await request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto);
    
    const approvedPurchaseReturn = await tenantDatabase.PurchaseReturn.findOne({
      where: { id: res.body.data.id }
    });
    const formApprovedPurchaseReturn = await approvedPurchaseReturn.getForm();
    await formApprovedPurchaseReturn.update({
      approvalStatus: 1
    });

    await request(app)
      .get('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .expect('Content-Type', /json/)
      .expect(async (res) => {
        const form = await pendingPurchaseReturn.getForm();
        const supplier = await pendingPurchaseReturn.getSupplier();
        const items = await pendingPurchaseReturn.getItems();
        const allocation = await items[0].getAllocation();
        const purchaseInvoice = await pendingPurchaseReturn.getPurchaseInvoice();
        const purchaseInvoiceForm = await purchaseInvoice.getForm();

        const approvedSupplier = await approvedPurchaseReturn.getSupplier();
        const approveditems = await approvedPurchaseReturn.getItems();
        const approvedallocation = await approveditems[0].getAllocation();
        const approvedPurchaseInvoice = await approvedPurchaseReturn.getPurchaseInvoice();
        const approvedPurchaseInvoiceForm = await approvedPurchaseInvoice.getForm();

        expect(res.status).toEqual(httpStatus.OK);
        expect(res.body).toMatchObject({
          data: expect.any(Array),
          meta: {
            currentPage: expect.any(Number),
            lastPage: expect.any(Number),
            perPage: expect.any(Number),
            total: 2
          }
        });
        expect(res.body.data).toMatchObject([
          {
            id: pendingPurchaseReturn.id,
            purchaseInvoiceId: pendingPurchaseReturn.purchaseInvoiceId,
            warehouseId: pendingPurchaseReturn.warehouseId,
            supplierId: pendingPurchaseReturn.supplierId,
            supplierName: pendingPurchaseReturn.supplierName,
            supplierAddress: pendingPurchaseReturn.supplierAddress,
            supplierPhone: pendingPurchaseReturn.supplierPhone,
            amount: pendingPurchaseReturn.amount,
            tax: pendingPurchaseReturn.tax,
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
            },
            purchaseInvoice: {
              id: purchaseInvoice.id,
              form: {
                number: purchaseInvoiceForm.number
              }
            }
          },
          {
            id: approvedPurchaseReturn.id,
            purchaseInvoiceId: approvedPurchaseReturn.purchaseInvoiceId,
            warehouseId: approvedPurchaseReturn.warehouseId,
            supplierId: approvedPurchaseReturn.supplierId,
            supplierName: approvedPurchaseReturn.supplierName,
            supplierAddress: approvedPurchaseReturn.supplierAddress,
            supplierPhone: approvedPurchaseReturn.supplierPhone,
            amount: approvedPurchaseReturn.amount,
            tax: approvedPurchaseReturn.tax,
            supplier: {
              id: approvedSupplier.id,
              code: approvedSupplier.code,
              name: approvedSupplier.name,
              address: approvedSupplier.address,
              city: approvedSupplier.city,
              state: approvedSupplier.state,
              country: approvedSupplier.country,
              phone: approvedSupplier.phone,
              email: approvedSupplier.email
            },
            items: [
              {
                id: approveditems[0].id,
                purchaseReturnId: approveditems[0].purchaseReturnId,
                purchaseInvoiceItemId: approveditems[0].purchaseInvoiceItemId,
                itemId: approveditems[0].itemId,
                itemName: approveditems[0].itemName,
                expiryDate: approveditems[0].expiryDate,
                productionNumber: approveditems[0].productionNumber,
                quantityInvoice: approveditems[0].quantityInvoice,
                quantity: approveditems[0].quantity,
                price: approveditems[0].price,
                discountPercent: approveditems[0].discountPercent,
                discountValue: approveditems[0].discountValue,
                unit: approveditems[0].unit,
                converter: approveditems[0].converter,
                notes: approveditems[0].notes,
                allocationId: approveditems[0].allocationId,
                allocation: {
                  id: approvedallocation.id,
                  name: approvedallocation.name
                }
              }
            ],
            form: {
              id: formApprovedPurchaseReturn.id,
              branchId: formApprovedPurchaseReturn.branchId,
              date: formApprovedPurchaseReturn.date.toISOString(),
              number: formApprovedPurchaseReturn.number,
              editedNumber: formApprovedPurchaseReturn.editedNumber,
              notes: formApprovedPurchaseReturn.notes,
              editedNotes: formApprovedPurchaseReturn.editedNotes,
              createdBy: formApprovedPurchaseReturn.createdBy,
              updatedBy: formApprovedPurchaseReturn.updatedBy,
              done: formApprovedPurchaseReturn.done,
              incrementNumber: formApprovedPurchaseReturn.incrementNumber,
              incrementGroup: formApprovedPurchaseReturn.incrementGroup,
              formableId: formApprovedPurchaseReturn.formableId,
              formableType: formApprovedPurchaseReturn.formableType,
              requestApprovalTo: formApprovedPurchaseReturn.requestApprovalTo,
              approvalBy: formApprovedPurchaseReturn.approvalBy,
              approvalAt: formApprovedPurchaseReturn.approvalAt,
              approvalReason: formApprovedPurchaseReturn.approvalReason,
              approvalStatus: formApprovedPurchaseReturn.approvalStatus,
              requestCancellationTo: formApprovedPurchaseReturn.requestCancellationTo,
              requestCancellationBy: formApprovedPurchaseReturn.requestCancellationBy,
              requestCancellationAt: formApprovedPurchaseReturn.requestCancellationAt,
              requestCancellationReason: formApprovedPurchaseReturn.requestCancellationReason,
              cancellationApprovalAt: formApprovedPurchaseReturn.cancellationApprovalAt,
              cancellationApprovalBy: formApprovedPurchaseReturn.cancellationApprovalBy,
              cancellationApprovalReason: formApprovedPurchaseReturn.cancellationApprovalReason,
              cancellationStatus: formApprovedPurchaseReturn.cancellationStatus,
            },
            purchaseInvoice: {
              id: approvedPurchaseInvoice.id,
              form: {
                number: approvedPurchaseInvoiceForm.number
              }
            }
          }
        ]);
      });      
  });

  it('return all data if form status filter is empty', async () => {
    const pendingPurchaseReturn = await tenantDatabase.PurchaseReturn.findOne();

    const res = await request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto);
    
    const donePurchaseReturn = await tenantDatabase.PurchaseReturn.findOne({
      where: { id: res.body.data.id }
    });
    const formDonePurchaseReturn = await donePurchaseReturn.getForm();
    await formDonePurchaseReturn.update({
      done: true
    });

    await request(app)
      .get('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .expect('Content-Type', /json/)
      .expect(async (res) => {
        const form = await pendingPurchaseReturn.getForm();
        const supplier = await pendingPurchaseReturn.getSupplier();
        const items = await pendingPurchaseReturn.getItems();
        const allocation = await items[0].getAllocation();
        const purchaseInvoice = await pendingPurchaseReturn.getPurchaseInvoice();
        const purchaseInvoiceForm = await purchaseInvoice.getForm();

        const doneSupplier = await donePurchaseReturn.getSupplier();
        const doneitems = await donePurchaseReturn.getItems();
        const doneallocation = await doneitems[0].getAllocation();
        const donePurchaseInvoice = await donePurchaseReturn.getPurchaseInvoice();
        const donePurchaseInvoiceForm = await donePurchaseInvoice.getForm();

        expect(res.status).toEqual(httpStatus.OK);
        expect(res.body).toMatchObject({
          data: expect.any(Array),
          meta: {
            currentPage: expect.any(Number),
            lastPage: expect.any(Number),
            perPage: expect.any(Number),
            total: 2
          }
        });
        expect(res.body.data).toMatchObject([
          {
            id: pendingPurchaseReturn.id,
            purchaseInvoiceId: pendingPurchaseReturn.purchaseInvoiceId,
            warehouseId: pendingPurchaseReturn.warehouseId,
            supplierId: pendingPurchaseReturn.supplierId,
            supplierName: pendingPurchaseReturn.supplierName,
            supplierAddress: pendingPurchaseReturn.supplierAddress,
            supplierPhone: pendingPurchaseReturn.supplierPhone,
            amount: pendingPurchaseReturn.amount,
            tax: pendingPurchaseReturn.tax,
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
            },
            purchaseInvoice: {
              id: purchaseInvoice.id,
              form: {
                number: purchaseInvoiceForm.number
              }
            }
          },
          {
            id: donePurchaseReturn.id,
            purchaseInvoiceId: donePurchaseReturn.purchaseInvoiceId,
            warehouseId: donePurchaseReturn.warehouseId,
            supplierId: donePurchaseReturn.supplierId,
            supplierName: donePurchaseReturn.supplierName,
            supplierAddress: donePurchaseReturn.supplierAddress,
            supplierPhone: donePurchaseReturn.supplierPhone,
            amount: donePurchaseReturn.amount,
            tax: donePurchaseReturn.tax,
            supplier: {
              id: doneSupplier.id,
              code: doneSupplier.code,
              name: doneSupplier.name,
              address: doneSupplier.address,
              city: doneSupplier.city,
              state: doneSupplier.state,
              country: doneSupplier.country,
              phone: doneSupplier.phone,
              email: doneSupplier.email
            },
            items: [
              {
                id: doneitems[0].id,
                purchaseReturnId: doneitems[0].purchaseReturnId,
                purchaseInvoiceItemId: doneitems[0].purchaseInvoiceItemId,
                itemId: doneitems[0].itemId,
                itemName: doneitems[0].itemName,
                expiryDate: doneitems[0].expiryDate,
                productionNumber: doneitems[0].productionNumber,
                quantityInvoice: doneitems[0].quantityInvoice,
                quantity: doneitems[0].quantity,
                price: doneitems[0].price,
                discountPercent: doneitems[0].discountPercent,
                discountValue: doneitems[0].discountValue,
                unit: doneitems[0].unit,
                converter: doneitems[0].converter,
                notes: doneitems[0].notes,
                allocationId: doneitems[0].allocationId,
                allocation: {
                  id: doneallocation.id,
                  name: doneallocation.name
                }
              }
            ],
            form: {
              id: formDonePurchaseReturn.id,
              branchId: formDonePurchaseReturn.branchId,
              date: formDonePurchaseReturn.date.toISOString(),
              number: formDonePurchaseReturn.number,
              editedNumber: formDonePurchaseReturn.editedNumber,
              notes: formDonePurchaseReturn.notes,
              editedNotes: formDonePurchaseReturn.editedNotes,
              createdBy: formDonePurchaseReturn.createdBy,
              updatedBy: formDonePurchaseReturn.updatedBy,
              done: formDonePurchaseReturn.done,
              incrementNumber: formDonePurchaseReturn.incrementNumber,
              incrementGroup: formDonePurchaseReturn.incrementGroup,
              formableId: formDonePurchaseReturn.formableId,
              formableType: formDonePurchaseReturn.formableType,
              requestApprovalTo: formDonePurchaseReturn.requestApprovalTo,
              approvalBy: formDonePurchaseReturn.approvalBy,
              approvalAt: formDonePurchaseReturn.approvalAt,
              approvalReason: formDonePurchaseReturn.approvalReason,
              approvalStatus: formDonePurchaseReturn.approvalStatus,
              requestCancellationTo: formDonePurchaseReturn.requestCancellationTo,
              requestCancellationBy: formDonePurchaseReturn.requestCancellationBy,
              requestCancellationAt: formDonePurchaseReturn.requestCancellationAt,
              requestCancellationReason: formDonePurchaseReturn.requestCancellationReason,
              cancellationApprovalAt: formDonePurchaseReturn.cancellationApprovalAt,
              cancellationApprovalBy: formDonePurchaseReturn.cancellationApprovalBy,
              cancellationApprovalReason: formDonePurchaseReturn.cancellationApprovalReason,
              cancellationStatus: formDonePurchaseReturn.cancellationStatus,
            },
            purchaseInvoice: {
              id: donePurchaseInvoice.id,
              form: {
                number: donePurchaseInvoiceForm.number
              }
            }
          }
        ]);
      });      
  });

  it('return current month data if date filter is empty', async () => {
    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne();

    createFormRequestDto.date = new Date('2022-11-01');
    await request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto);

    await request(app)
      .get('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .expect('Content-Type', /json/)
      .expect(async (res) => {
        const form = await purchaseReturn.getForm();
        const supplier = await purchaseReturn.getSupplier();
        const items = await purchaseReturn.getItems();
        const allocation = await items[0].getAllocation();
        const purchaseInvoice = await purchaseReturn.getPurchaseInvoice();
        const purchaseInvoiceForm = await purchaseInvoice.getForm();

        expect(res.status).toEqual(httpStatus.OK);
        expect(res.body).toMatchObject({
          data: expect.any(Array),
          meta: {
            currentPage: expect.any(Number),
            lastPage: expect.any(Number),
            perPage: expect.any(Number),
            total: 1
          }
        });
        expect(res.body.data[0]).toMatchObject({
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

  it('return form with status approved', async () => {
    const res = await request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto);
    
    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne({
      where: { id: res.body.data.id }
    });
    const form = await purchaseReturn.getForm();
    await form.update({
      approvalStatus: 1
    });

    const queries = 'filter_approval=approved'

    await request(app)
      .get('/v1/purchase/return?' + queries)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .expect('Content-Type', /json/)
      .expect(async (res) => {
        const supplier = await purchaseReturn.getSupplier();
        const items = await purchaseReturn.getItems();
        const allocation = await items[0].getAllocation();
        const purchaseInvoice = await purchaseReturn.getPurchaseInvoice();
        const purchaseInvoiceForm = await purchaseInvoice.getForm();

        expect(res.status).toEqual(httpStatus.OK);
        expect(res.body).toMatchObject({
          data: expect.any(Array),
          meta: {
            currentPage: expect.any(Number),
            lastPage: expect.any(Number),
            perPage: expect.any(Number),
            total: 1
          }
        });
        expect(res.body.data).toMatchObject([{
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
          },
          purchaseInvoice: {
            id: purchaseInvoice.id,
            form: {
              number: purchaseInvoiceForm.number
            }
          }
        }]);
      });
  });

  it('return form with status done', async () => {
    const res = await request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto);
    
    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne({
      where: { id: res.body.data.id }
    });
    const form = await purchaseReturn.getForm();
    await form.update({
      done: true
    });

    const queries = 'filter_form=done'

    await request(app)
      .get('/v1/purchase/return?' + queries)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .expect('Content-Type', /json/)
      .expect(async (res) => {
        const supplier = await purchaseReturn.getSupplier();
        const items = await purchaseReturn.getItems();
        const allocation = await items[0].getAllocation();
        const purchaseInvoice = await purchaseReturn.getPurchaseInvoice();
        const purchaseInvoiceForm = await purchaseInvoice.getForm();

        expect(res.status).toEqual(httpStatus.OK);
        expect(res.body).toMatchObject({
          data: expect.any(Array),
          meta: {
            currentPage: expect.any(Number),
            lastPage: expect.any(Number),
            perPage: expect.any(Number),
            total: 1
          }
        });
        expect(res.body.data).toMatchObject([{
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
          },
          purchaseInvoice: {
            id: purchaseInvoice.id,
            form: {
              number: purchaseInvoiceForm.number
            }
          }
        }]);
      });
  });

  it('return form with filter date', async () => {
    createFormRequestDto.date = new Date('2022-11-01');
    const res = await request(app)
      .post('/v1/purchase/return')
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .set('Content-Type', 'application/json')
      .send(createFormRequestDto);
    
    const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne({
      where: { id: res.body.data.id }
    });
    const form = await purchaseReturn.getForm();
    await form.update({
      done: true
    });

    const queries = 'filter_date_min=2022-11-01+00:00:00&filter_date_max=2022-11-30+23:59:59'

    await request(app)
      .get('/v1/purchase/return?' + queries)
      .set('Authorization', 'Bearer '+ jwtoken)
      .set('Tenant', 'test_dev')
      .expect('Content-Type', /json/)
      .expect(async (res) => {
        const supplier = await purchaseReturn.getSupplier();
        const items = await purchaseReturn.getItems();
        const allocation = await items[0].getAllocation();
        const purchaseInvoice = await purchaseReturn.getPurchaseInvoice();
        const purchaseInvoiceForm = await purchaseInvoice.getForm();

        expect(res.status).toEqual(httpStatus.OK);
        expect(res.body).toMatchObject({
          data: expect.any(Array),
          meta: {
            currentPage: expect.any(Number),
            lastPage: expect.any(Number),
            perPage: expect.any(Number),
            total: 1
          }
        });
        expect(res.body.data).toMatchObject([{
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
          },
          purchaseInvoice: {
            id: purchaseInvoice.id,
            form: {
              number: purchaseInvoiceForm.number
            }
          }
        }]);
      });
  });
});

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