const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const tenantDatabase = require('@src/models').tenant;
const factory = require('@root/tests/utils/factory');
const ProcessSendCreateApproval = require('../../workers/ProcessSendCreateApproval.worker');
const CreateFormRequest = require('./CreateFormRequest');

jest.mock('../../workers/ProcessSendCreateApproval.worker');
const mockedTime = new Date(Date.UTC(2021, 0, 1)).valueOf();
Date.now = jest.fn(() => new Date(mockedTime));

beforeEach(() => {
  ProcessSendCreateApproval.mockClear();
});

describe('Sales Invoice - CreateFormRequest', () => {
  describe('validations', () => {
    it("can't create when requested by user that does not have branch default", async () => {
      const maker = await factory.user.create();
      const branch = await factory.branch.create();
      const branchUser = await factory.branchUser.create({ user: maker, branch, isDefault: false });
      const { formDeliveryNote, item, allocation, deliveryNoteItem, itemUnit, approver, customer } =
        await generateRecordFactories({ maker, branch, branchUser });
      const createFormRequestDto = generateCreateFormRequestDto({
        formDeliveryNote,
        item,
        allocation,
        deliveryNoteItem,
        itemUnit,
        maker,
        approver,
        customer,
      });

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, { maker, createFormRequestDto }).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'Forbidden - Invalid default branch'));
    });

    it("can't create when requested by user that does not have warehouse default", async () => {
      const maker = await factory.user.create();
      const branch = await factory.branch.create();
      const warehouse = await factory.warehouse.create({ branch });
      const userWarehouse = await factory.userWarehouse.create({ user: maker, warehouse, isDefault: false });
      const { formDeliveryNote, item, allocation, deliveryNoteItem, itemUnit, approver, customer } =
        await generateRecordFactories({ maker, branch, warehouse, userWarehouse });
      const createFormRequestDto = generateCreateFormRequestDto({
        formDeliveryNote,
        item,
        allocation,
        deliveryNoteItem,
        itemUnit,
        maker,
        approver,
        customer,
      });

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, { maker, createFormRequestDto }).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'Forbidden - Invalid default warehouse'));
    });
  });

  describe('success create / typeOfTax non', () => {
    let createFormRequestDto, salesInvoiceForm, salesInvoice, maker, approver, formDeliveryNote;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      const { item, allocation, deliveryNoteItem, itemUnit, customer } = recordFactories;
      ({ maker, approver, formDeliveryNote } = recordFactories);
      createFormRequestDto = generateCreateFormRequestDto({
        formDeliveryNote,
        item,
        allocation,
        deliveryNoteItem,
        itemUnit,
        maker,
        approver,
        customer,
      });
      ({ salesInvoiceForm, salesInvoice } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      done();
    });

    it('create form with correct data', () => {
      expect(salesInvoiceForm).toBeDefined();
      expect(salesInvoiceForm.number).toEqual('SI2101001');
      expect(salesInvoiceForm.approvalStatus).toEqual(0);
    });

    it('has correct user data who created form', async () => {
      const createdByUser = await salesInvoiceForm.getCreatedByUser();
      expect(createdByUser.id).toEqual(maker.id);
    });

    it('has correct user approver data', async () => {
      const requestApprovalToUser = await salesInvoiceForm.getRequestApprovalToUser();
      expect(requestApprovalToUser.id).toEqual(approver.id);
    });

    it('has correct sales invoice items data', async () => {
      const salesInvoiceItems = await salesInvoice.getItems();
      expect(salesInvoiceItems.length).toEqual(1);

      const firstItemSalesInvoiceCreateSalesInvoiceDto = createFormRequestDto.items[0];
      const firstSalesInvoiceItem = salesInvoiceItems[0];

      expect(firstSalesInvoiceItem.quantity).toEqual(firstItemSalesInvoiceCreateSalesInvoiceDto.quantity);
      expect(firstSalesInvoiceItem.price).toEqual(firstItemSalesInvoiceCreateSalesInvoiceDto.price);
    });

    it('has correct sales invoice data', async () => {
      expect(salesInvoice.typeOfTax).toEqual('non');
      expect(salesInvoice.tax).toEqual(0); // 0 tax
      expect(salesInvoice.amount).toEqual(100000); // 10.000 * 10
      expect(salesInvoice.dueDate).toEqual(createFormRequestDto.dueDate);
    });

    it('updates form reference to done', async () => {
      await formDeliveryNote.reload();
      expect(formDeliveryNote.done).toBeTruthy();
    });
  });

  describe('typeOfTax include', () => {
    let createFormRequestDto, salesInvoice, maker, approver, formDeliveryNote;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      const { item, allocation, deliveryNoteItem, itemUnit, customer } = recordFactories;
      ({ maker, approver, formDeliveryNote } = recordFactories);
      createFormRequestDto = generateCreateFormRequestDto({
        formDeliveryNote,
        item,
        allocation,
        deliveryNoteItem,
        itemUnit,
        maker,
        approver,
        customer,
      });
      createFormRequestDto.typeOfTax = 'include';

      ({ salesInvoice } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      done();
    });

    it('has correct sales invoice data', async () => {
      expect(salesInvoice.typeOfTax).toEqual('include');
      const subTotal = 100000; // 10.000 * 10
      const taxBase = subTotal - 0; // without sales invoice discount | 10.0000
      const tax = (taxBase * 10) / 110; // include | 9090,909090909091
      const amount = subTotal; // include not need to add tax to amount | 100.000
      expect(salesInvoice.tax).toEqual(tax);
      expect(salesInvoice.amount).toEqual(amount);
      expect(salesInvoice.dueDate).toEqual(createFormRequestDto.dueDate);
    });
  });

  describe('typeOfTax exclude', () => {
    let createFormRequestDto, salesInvoice, maker, approver, formDeliveryNote;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      const { item, allocation, deliveryNoteItem, itemUnit, customer } = recordFactories;
      ({ maker, approver, formDeliveryNote } = recordFactories);
      createFormRequestDto = generateCreateFormRequestDto({
        formDeliveryNote,
        item,
        allocation,
        deliveryNoteItem,
        itemUnit,
        maker,
        approver,
        customer,
      });
      createFormRequestDto.typeOfTax = 'exclude';

      ({ salesInvoice } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      done();
    });

    it('has correct sales invoice data', async () => {
      expect(salesInvoice.typeOfTax).toEqual('exclude');
      const subTotal = 100000; // 10.000 * 10
      const taxBase = subTotal - 0; // without sales invoice discount | 100.000
      const tax = taxBase * 0.1; // exclude | 10.000
      const amount = taxBase + tax; // 110.000
      expect(salesInvoice.tax).toEqual(tax);
      expect(salesInvoice.amount).toEqual(amount);
      expect(salesInvoice.dueDate).toEqual(createFormRequestDto.dueDate);
    });
  });

  describe('item has discount value', () => {
    let createFormRequestDto, salesInvoice, maker, approver, formDeliveryNote;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      const { item, allocation, deliveryNoteItem, itemUnit, customer } = recordFactories;
      ({ maker, approver, formDeliveryNote } = recordFactories);
      createFormRequestDto = generateCreateFormRequestDto({
        formDeliveryNote,
        item,
        allocation,
        deliveryNoteItem,
        itemUnit,
        maker,
        approver,
        customer,
      });
      createFormRequestDto.typeOfTax = 'exclude';
      createFormRequestDto.items[0].discountValue = 2000;

      ({ salesInvoice } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      done();
    });

    it('has correct sales invoice data', async () => {
      expect(salesInvoice.typeOfTax).toEqual('exclude');
      const subTotal = 80000; // (10.000 * 10) - (2.000 * 10)
      const taxBase = subTotal - 0; // without sales invoice discount
      const tax = taxBase * 0.1; // exclude
      const amount = taxBase + tax;
      expect(salesInvoice.tax).toEqual(tax);
      expect(salesInvoice.amount).toEqual(amount);
      expect(salesInvoice.dueDate).toEqual(createFormRequestDto.dueDate);
    });
  });

  describe('item has discount percent', () => {
    let createFormRequestDto, salesInvoice, maker, approver, formDeliveryNote;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      const { item, allocation, deliveryNoteItem, itemUnit, customer } = recordFactories;
      ({ maker, approver, formDeliveryNote } = recordFactories);
      createFormRequestDto = generateCreateFormRequestDto({
        formDeliveryNote,
        item,
        allocation,
        deliveryNoteItem,
        itemUnit,
        maker,
        approver,
        customer,
      });
      createFormRequestDto.typeOfTax = 'exclude';
      createFormRequestDto.items[0].discountPercent = 10;

      ({ salesInvoice } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      done();
    });

    it('has correct sales invoice data', async () => {
      expect(salesInvoice.typeOfTax).toEqual('exclude');
      const subTotal = 90000; // 9.000 * 10
      const taxBase = subTotal - 0; // without sales invoice discount
      const tax = taxBase * 0.1; // exclude
      const amount = taxBase + tax;
      expect(salesInvoice.tax).toEqual(tax);
      expect(salesInvoice.amount).toEqual(amount);
      expect(salesInvoice.dueDate).toEqual(createFormRequestDto.dueDate);
    });
  });

  describe('sales invoice has discount value', () => {
    let createFormRequestDto, salesInvoice, maker, approver, formDeliveryNote;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      const { item, allocation, deliveryNoteItem, itemUnit, customer } = recordFactories;
      ({ maker, approver, formDeliveryNote } = recordFactories);
      createFormRequestDto = generateCreateFormRequestDto({
        formDeliveryNote,
        item,
        allocation,
        deliveryNoteItem,
        itemUnit,
        maker,
        approver,
        customer,
      });
      createFormRequestDto.typeOfTax = 'exclude';
      createFormRequestDto.discountValue = 10000;

      ({ salesInvoice } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      done();
    });

    it('has correct sales invoice data', async () => {
      expect(salesInvoice.typeOfTax).toEqual('exclude');
      const subTotal = 90000; // 10.000 * 10 - 10.000
      const taxBase = subTotal - 0; // without sales invoice discount
      const tax = taxBase * 0.1; // exclude
      const amount = taxBase + tax;
      expect(salesInvoice.tax).toEqual(tax);
      expect(salesInvoice.amount).toEqual(amount);
      expect(salesInvoice.dueDate).toEqual(createFormRequestDto.dueDate);
    });
  });

  describe('sales invoice has discount percent', () => {
    let createFormRequestDto, salesInvoice, maker, approver, formDeliveryNote;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      const { item, allocation, deliveryNoteItem, itemUnit, customer } = recordFactories;
      ({ maker, approver, formDeliveryNote } = recordFactories);
      createFormRequestDto = generateCreateFormRequestDto({
        formDeliveryNote,
        item,
        allocation,
        deliveryNoteItem,
        itemUnit,
        maker,
        approver,
        customer,
      });
      createFormRequestDto.typeOfTax = 'exclude';
      createFormRequestDto.discountPercent = 10;

      ({ salesInvoice } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      done();
    });

    it('has correct sales invoice data', async () => {
      expect(salesInvoice.typeOfTax).toEqual('exclude');
      const subTotal = 90000; // (10.000 * 10) - (10.000 * 10 * 10%)
      const taxBase = subTotal - 0; // without sales invoice discount
      const tax = taxBase * 0.1; // exclude
      const amount = taxBase + tax;
      expect(salesInvoice.tax).toEqual(tax);
      expect(salesInvoice.amount).toEqual(amount);
      expect(salesInvoice.dueDate).toEqual(createFormRequestDto.dueDate);
    });
  });

  describe('with sales visitation as reference', () => {
    let createFormRequestDto,
      salesInvoice,
      salesInvoiceForm,
      maker,
      approver,
      formSalesVisitation,
      branch,
      branchUser,
      customer;
    beforeEach(async (done) => {
      const recordFactories = await generateSalesVisitationRecordFactories();
      const { item, allocation, salesVisitationDetail, itemUnit } = recordFactories;
      ({ maker, approver, formSalesVisitation, branch, branchUser, customer } = recordFactories);
      createFormRequestDto = generateSalesVisitationCreateFormRequestDto({
        formSalesVisitation,
        item,
        allocation,
        salesVisitationDetail,
        itemUnit,
        maker,
        approver,
        customer,
      });

      done();
    });

    it('returs correct sales invoice', async () => {
      ({ salesInvoiceForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      expect(salesInvoiceForm).toBeDefined();
      expect(salesInvoiceForm.number).toEqual('SI2101001');
      expect(salesInvoiceForm.approvalStatus).toEqual(0);
    });

    it('returs correct sales invoice with null customer phone and address', async () => {
      await customer.update({ phone: null, address: null });

      ({ salesInvoice, salesInvoiceForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      expect(salesInvoiceForm).toBeDefined();
      expect(salesInvoiceForm.number).toEqual('SI2101001');
      expect(salesInvoiceForm.approvalStatus).toEqual(0);
      expect(salesInvoice.customerPhone).toEqual('');
      expect(salesInvoice.customerAddress).toEqual('');
    });

    it('increase form number', async () => {
      await factory.form.create({
        branch,
        maker,
        approver,
        number: 'SI2101001',
        formable: { id: 1 },
        formableType: 'SalesInvoice',
        createdBy: maker.id,
        updatedBy: maker.id,
        requestApprovalTo: approver.id,
        incrementGroup: '202101',
      });
      ({ salesInvoice, salesInvoiceForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      expect(salesInvoiceForm).toBeDefined();
      expect(salesInvoiceForm.number).toEqual('SI2101002');
      expect(salesInvoiceForm.approvalStatus).toEqual(0);
    });

    it('throws error when branch user not exist', async () => {
      await branchUser.destroy();

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow('Forbidden - Invalid default branch');
    });
  });

  describe('failed', () => {
    let createFormRequestDto, maker, approver, formDeliveryNote, item, branchUser, itemUnit;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      const { allocation, deliveryNoteItem, customer } = recordFactories;
      ({ maker, approver, formDeliveryNote, item, branchUser, itemUnit } = recordFactories);
      createFormRequestDto = generateCreateFormRequestDto({
        formDeliveryNote,
        item,
        allocation,
        deliveryNoteItem,
        itemUnit,
        maker,
        approver,
        customer,
      });

      done();
    });

    it('throws error when form reference done status not exist', async () => {
      await formDeliveryNote.destroy();

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow('Form reference without done status not found');
    });

    it('throws error when stock is not enough', async () => {
      createFormRequestDto.items[0].quantity = 500;
      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow(`Insufficient ${item.name} stock`);
    });

    it('throws error when branch user not exist', async () => {
      await branchUser.destroy();

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow('Forbidden - Invalid default branch');
    });

    it('throws error when item unit not exist', async () => {
      await itemUnit.destroy();

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow('Item unit pcs not found');
    });
  });
});

const generateRecordFactories = async ({
  maker,
  approver,
  branch,
  branchUser,
  customer,
  warehouse,
  userWarehouse,
  deliveryOrder,
  item,
  itemUnit,
  deliveryNote,
  allocation,
  deliveryNoteItem,
  formDeliveryNote,
  inventoryForm,
  inventory,
} = {}) => {
  maker = maker || (await factory.user.create());
  approver = approver || (await factory.user.create());
  branch = branch || (await factory.branch.create());
  // create relation between maker and branch for authorization
  branchUser = branchUser || (await factory.branchUser.create({ user: maker, branch, isDefault: true }));
  customer = customer || (await factory.customer.create({ branch }));
  warehouse = warehouse || (await factory.warehouse.create({ branch }));
  // create relation between maker and warehouse for authorization
  userWarehouse = userWarehouse || (await factory.userWarehouse.create({ user: maker, warehouse, isDefault: true }));
  deliveryOrder = deliveryOrder || (await factory.deliveryOrder.create({ customer, warehouse }));
  item = item || (await factory.item.create());
  itemUnit = itemUnit || (await factory.itemUnit.create({ item, createdBy: maker.id }));
  deliveryNote = deliveryNote || (await factory.deliveryNote.create({ customer, warehouse, deliveryOrder }));
  allocation = allocation || (await factory.allocation.create({ branch }));
  deliveryNoteItem = deliveryNoteItem || (await factory.deliveryNoteItem.create({ deliveryNote, item, allocation }));
  formDeliveryNote =
    formDeliveryNote ||
    (await factory.form.create({
      branch,
      formable: deliveryNote,
      formableType: 'SalesDeliveryNote',
      createdBy: maker.id,
      updatedBy: maker.id,
      requestApprovalTo: approver.id,
    }));
  inventoryForm = await factory.form.create({
    branch,
    number: 'PI2101001',
    formable: { id: 1 },
    formableType: 'PurchaseInvoice',
    createdBy: maker.id,
    updatedBy: maker.id,
    date: new Date(mockedTime - 1000),
    ...inventoryForm,
  });
  inventory = await factory.inventory.create({ form: inventoryForm, warehouse, item });

  return {
    maker,
    approver,
    branch,
    branchUser,
    customer,
    warehouse,
    userWarehouse,
    deliveryOrder,
    item,
    itemUnit,
    deliveryNote,
    allocation,
    deliveryNoteItem,
    formDeliveryNote,
    inventoryForm,
    inventory,
  };
};

const generateCreateFormRequestDto = ({
  formDeliveryNote,
  item,
  deliveryNoteItem,
  itemUnit,
  maker,
  approver,
  customer,
  allocation,
}) => ({
  formId: formDeliveryNote.id,
  items: [
    {
      itemId: item.id,
      referenceItemId: deliveryNoteItem.id,
      quantity: 10,
      itemUnit: itemUnit.label,
      converter: itemUnit.converter,
      allocationId: allocation.id,
      price: 10000,
      discountPercent: 0,
      discountValue: 0,
    },
  ],
  createdBy: maker.id,
  requestApprovalTo: approver.id,
  dueDate: new Date('2021-01-01'),
  discountPercent: 0,
  discountValue: 0,
  customerId: customer.id,
  typeOfTax: 'non',
  notes: 'example form note',
});

const generateSalesVisitationRecordFactories = async ({
  maker,
  approver,
  branch,
  branchUser,
  customer,
  warehouse,
  userWarehouse,
  deliveryOrder,
  item,
  itemUnit,
  salesVisitation,
  allocation,
  salesVisitationDetail,
  formSalesVisitation,
  inventoryForm,
  inventory,
} = {}) => {
  maker = maker || (await factory.user.create());
  approver = approver || (await factory.user.create());
  branch = branch || (await factory.branch.create());
  // create relation between maker and branch for authorization
  branchUser = branchUser || (await factory.branchUser.create({ user: maker, branch, isDefault: true }));
  customer = customer || (await factory.customer.create({ branch }));
  warehouse = warehouse || (await factory.warehouse.create({ branch }));
  // create relation between maker and warehouse for authorization
  userWarehouse = userWarehouse || (await factory.userWarehouse.create({ user: maker, warehouse, isDefault: true }));
  deliveryOrder = deliveryOrder || (await factory.deliveryOrder.create({ customer, warehouse }));
  item = item || (await factory.item.create());
  itemUnit = itemUnit || (await factory.itemUnit.create({ item, createdBy: maker.id }));
  formSalesVisitation =
    formSalesVisitation ||
    (await factory.form.create({
      number: 'SV2101001',
      branch,
      formable: { id: 0 },
      formableType: '',
      createdBy: maker.id,
      updatedBy: maker.id,
      requestApprovalTo: approver.id,
    }));
  salesVisitation =
    salesVisitation ||
    (await factory.salesVisitation.create({
      form: formSalesVisitation,
      branch,
      customer,
      warehouse,
      deliveryOrder,
      group: 1,
    }));
  allocation = allocation || (await factory.allocation.create({ branch }));
  salesVisitationDetail =
    salesVisitationDetail || (await factory.salesVisitationDetail.create({ salesVisitation, item, allocation }));
  inventoryForm = await factory.form.create({
    branch,
    number: 'PI2101001',
    formable: { id: 1 },
    formableType: 'PurchaseInvoice',
    createdBy: maker.id,
    updatedBy: maker.id,
    date: new Date(mockedTime - 1000),
    ...inventoryForm,
  });
  inventory = await factory.inventory.create({ form: inventoryForm, warehouse, item });

  return {
    maker,
    approver,
    branch,
    branchUser,
    customer,
    warehouse,
    userWarehouse,
    deliveryOrder,
    item,
    itemUnit,
    salesVisitation,
    allocation,
    salesVisitationDetail,
    formSalesVisitation,
    inventoryForm,
    inventory,
  };
};

const generateSalesVisitationCreateFormRequestDto = ({
  formSalesVisitation,
  item,
  salesVisitationDetail,
  itemUnit,
  maker,
  approver,
  customer,
  allocation,
}) => ({
  formId: formSalesVisitation.id,
  items: [
    {
      itemId: item.id,
      referenceItemId: salesVisitationDetail.id,
      quantity: 10,
      itemUnit: itemUnit.label,
      converter: itemUnit.converter,
      allocationId: allocation.id,
      price: 10000,
      discountPercent: 0,
      discountValue: 0,
    },
  ],
  createdBy: maker.id,
  requestApprovalTo: approver.id,
  dueDate: new Date('2021-01-01'),
  discountPercent: 0,
  discountValue: 0,
  customerId: customer.id,
  typeOfTax: 'non',
  notes: 'example form note',
});
