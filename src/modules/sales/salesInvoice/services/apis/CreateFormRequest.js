const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const GetCurrentStock = require('@src/modules/inventory/services/GetCurrentStock');
const ProcessSendCreateApprovalWorker = require('../../workers/ProcessSendCreateApproval.worker');

class CreateFormRequest {
  constructor(tenantDatabase, { maker, createFormRequestDto }) {
    this.tenantDatabase = tenantDatabase;
    this.maker = maker;
    this.createFormRequestDto = createFormRequestDto;
  }

  async call() {
    const currentDate = new Date(Date.now());
    const { formId: formReferenceId } = this.createFormRequestDto;
    const { formReference, reference } = await getReference(this.tenantDatabase, formReferenceId);

    await validate(this.tenantDatabase, { maker: this.maker, formReference, reference });

    let salesInvoice, salesInvoiceForm;
    await this.tenantDatabase.sequelize.transaction(async (transaction) => {
      ({ salesInvoice, salesInvoiceForm } = await processCreateSalesInvoice(this.tenantDatabase, {
        reference,
        formReference,
        currentDate,
        createFormRequestDto: this.createFormRequestDto,
        maker: this.maker,
        transaction,
      }));

      await formReference.update({ done: true }, { transaction });
    });

    await sendEmailToApprover(this.tenantDatabase, salesInvoice);

    return { salesInvoiceForm, salesInvoice };
  }
}

async function getReference(tenantDatabase, formReferenceId) {
  const formReference = await tenantDatabase.Form.findOne({ where: { id: formReferenceId, done: false } });
  if (!formReference) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Form reference without done status not found');
  }

  let reference;
  if (formReference.number.startsWith('DN')) {
    reference = await formReference.getFormable();
  } else if (formReference.number.startsWith('SV')) {
    reference = await formReference.getSalesVisitation();
  }

  return { formReference, reference };
}

async function validate(tenantDatabase, { maker, formReference, reference }) {
  if (formReference.number.startsWith('SV')) {
    await validateBranchDefaultPermissionSalesVisitation(tenantDatabase, { maker, reference });
  } else {
    await validateBranchDefaultPermission(tenantDatabase, { maker, formReference });
  }
  await validateWarehouseDefaultPermission(tenantDatabase, { maker, reference });
}

async function validateBranchDefaultPermission(tenantDatabase, { maker, formReference }) {
  const branchUser = await tenantDatabase.BranchUser.findOne({
    where: {
      userId: maker.id,
      branchId: formReference.branchId,
      isDefault: true,
    },
  });
  if (!branchUser) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden - Invalid default branch');
  }
}

async function validateBranchDefaultPermissionSalesVisitation(tenantDatabase, { maker, reference }) {
  const branchUser = await tenantDatabase.BranchUser.findOne({
    where: {
      userId: maker.id,
      branchId: reference.branchId,
      isDefault: true,
    },
  });
  if (!branchUser) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden - Invalid default branch');
  }
}

async function validateWarehouseDefaultPermission(tenantDatabase, { maker, reference }) {
  const userWarehouse = await tenantDatabase.UserWarehouse.findOne({
    where: {
      userId: maker.id,
      warehouseId: reference.warehouseId,
      isDefault: true,
    },
  });
  if (!userWarehouse) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden - Invalid default warehouse');
  }
}

async function processCreateSalesInvoice(
  tenantDatabase,
  { reference, formReference, currentDate, createFormRequestDto, maker, transaction }
) {
  const salesInvoice = await createSalesInvoice(tenantDatabase, {
    reference,
    createFormRequestDto,
    transaction,
  });
  const salesInvoiceForm = await createSalesInvoiceForm(tenantDatabase, {
    maker,
    formReference,
    createFormRequestDto,
    salesInvoice,
    currentDate,
    transaction,
  });

  return { salesInvoice, salesInvoiceForm };
}

async function createSalesInvoice(tenantDatabase, { reference, createFormRequestDto, transaction }) {
  const salesInvoiceData = await buildSalesInvoiceData(tenantDatabase, { reference, createFormRequestDto });
  const salesInvoice = await tenantDatabase.SalesInvoice.create(salesInvoiceData, { transaction });
  await addSalesInvoiceItems(tenantDatabase, { salesInvoice, reference, createFormRequestDto, transaction });

  return salesInvoice;
}

async function buildSalesInvoiceData(tenantDatabase, { reference, createFormRequestDto }) {
  const { dueDate, typeOfTax, customerId, items, discountPercent, discountValue } = createFormRequestDto;

  const subTotal = getSubTotal(items);
  const taxBase = getTaxBase({ subTotal, discountValue, discountPercent });
  const tax = getTax(taxBase, typeOfTax);
  const amount = getAmount({ taxBase, tax, typeOfTax });
  const customer = await getCustomer(tenantDatabase, customerId);

  return {
    dueDate,
    discountPercent,
    discountValue,
    tax,
    typeOfTax,
    amount,
    remaining: amount,
    customerId,
    customerName: customer.name,
    customerAddress: customer.address || '',
    customerPhone: customer.phone || '',
    referenceableId: reference.id,
    referenceableType: reference.constructor.getMorphType(),
  };
}

async function addSalesInvoiceItems(tenantDatabase, { salesInvoice, reference, createFormRequestDto, transaction }) {
  const { items: itemPayloads, dueDate: formDate } = createFormRequestDto;
  const salesInvoiceItems = await Promise.all(
    itemPayloads.map(async (itemPayload) => {
      await createSalesInvoiceItem(tenantDatabase, { salesInvoice, formDate, reference, itemPayload, transaction });
    })
  );

  return salesInvoiceItems;
}

async function createSalesInvoiceItem(tenantDatabase, { salesInvoice, formDate, reference, itemPayload, transaction }) {
  const referenceClassName = reference.constructor.name;
  let referenceItem;
  switch (referenceClassName) {
    case 'DeliveryNote':
      referenceItem = await tenantDatabase.DeliveryNoteItem.findOne({
        where: {
          id: itemPayload.referenceItemId,
        },
      });
      break;
    case 'SalesVisitation':
      referenceItem = await tenantDatabase.SalesVisitationDetail.findOne({
        where: {
          id: itemPayload.referenceItemId,
        },
      });
      break;
    default:
  }
  const item = await referenceItem.getItem();
  const itemUnit = await tenantDatabase.ItemUnit.findOne({
    where: { itemId: item.id, label: itemPayload.itemUnit, converter: itemPayload.converter },
  });
  if (!itemUnit) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Item unit ${itemPayload.itemUnit} not found`);
  }

  await checkStock(tenantDatabase, { item, date: formDate, warehouseId: reference.warehouseId, itemPayload });
  return tenantDatabase.SalesInvoiceItem.create(
    {
      salesInvoiceId: salesInvoice.id,
      referenceableId: reference.id,
      referenceableType: reference.constructor.getMorphType(),
      itemReferenceableId: referenceItem.id,
      itemReferenceableType: referenceItem.constructor.getMorphType(),
      itemId: item.id,
      itemName: item.name,
      quantity: itemPayload.quantity,
      quantityRemaining: itemPayload.quantity,
      price: itemPayload.price,
      discountPercent: itemPayload.discountPercent,
      discountValue: itemPayload.discountValue,
      taxable: itemPayload.taxable,
      unit: itemUnit.label,
      converter: itemUnit.converter,
      allocationId: itemPayload.allocationId,
      expiryDate: itemPayload.expiryDate,
      productionNumber: itemPayload.productionNumber,
    },
    { transaction }
  );
}

async function checkStock(tenantDatabase, { item, date, warehouseId, itemPayload }) {
  const itemStock = await new GetCurrentStock(tenantDatabase, {
    item,
    date,
    warehouseId,
    options: { expiryDate: itemPayload.expiryDate, productionNumber: itemPayload.productionNumber },
  }).call();
  const targetStock = itemStock - itemPayload.quantity;
  if (targetStock < 0) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, `Insufficient ${item.name} stock`);
  }
}

async function createSalesInvoiceForm(
  tenantDatabase,
  { maker, formReference, createFormRequestDto, salesInvoice, currentDate }
) {
  const formData = await buildFormData(tenantDatabase, {
    maker,
    formReference,
    createFormRequestDto,
    salesInvoice,
    currentDate,
  });
  const form = await tenantDatabase.Form.create(formData);

  return form;
}

function getSubTotal(items) {
  const subTotal = items.reduce((result, item) => {
    return result + getItemsPrice(item);
  }, 0);

  return subTotal;
}

function getItemsPrice(item) {
  let perItemPrice = item.price;
  if (item.discountValue > 0) {
    perItemPrice -= item.discountValue;
  }
  if (item.discountPercent > 0) {
    const discountPercent = item.discountPercent / 100;
    perItemPrice -= perItemPrice * discountPercent;
  }
  const totalItemPrice = perItemPrice * item.quantity;

  return totalItemPrice;
}

function getTaxBase({ subTotal, discountValue, discountPercent }) {
  if (discountValue > 0) {
    return subTotal - discountValue;
  }

  if (discountPercent > 0) {
    return subTotal - subTotal * (discountPercent / 100);
  }

  return subTotal;
}

function getTax(taxBase, typeOfTax) {
  if (typeOfTax === 'include') {
    return (taxBase * 10) / 110;
  }

  if (typeOfTax === 'exclude') {
    return taxBase * 0.1;
  }

  return 0;
}

function getAmount({ taxBase, tax, typeOfTax }) {
  if (typeOfTax === 'exclude') {
    return taxBase + tax;
  }

  return taxBase;
}

async function getCustomer(tenantDatabase, customerId) {
  const customer = await tenantDatabase.Customer.findOne({ where: { id: customerId } });

  return customer;
}

async function buildFormData(tenantDatabase, { maker, formReference, createFormRequestDto, salesInvoice, currentDate }) {
  const { notes, requestApprovalTo } = createFormRequestDto;
  const { incrementNumber, incrementGroup } = await getFormIncrement(tenantDatabase, currentDate);
  const formNumber = generateFormNumber(currentDate, incrementNumber);

  return {
    branchId: formReference.branchId,
    date: new Date(),
    number: formNumber,
    notes,
    createdBy: maker.id,
    updatedBy: maker.id,
    incrementNumber,
    incrementGroup,
    formableId: salesInvoice.id,
    formableType: 'SalesInvoice',
    requestApprovalTo,
  };
}

async function getFormIncrement(tenantDatabase, currentDate) {
  const incrementGroup = `${currentDate.getFullYear()}${getMonthFormattedString(currentDate)}`;
  const lastForm = await tenantDatabase.Form.findOne({
    where: {
      formableType: 'SalesInvoice',
      incrementGroup,
    },
    order: [['increment', 'DESC']],
  });

  return {
    incrementGroup,
    incrementNumber: lastForm ? lastForm.incrementNumber + 1 : 1,
  };
}

function generateFormNumber(currentDate, incrementNumber) {
  const monthValue = getMonthFormattedString(currentDate);
  const yearValue = getYearFormattedString(currentDate);
  const orderNumber = `000${incrementNumber}`.slice(-3);
  return `SI${yearValue}${monthValue}${orderNumber}`;
}

function getYearFormattedString(currentDate) {
  const fullYear = currentDate.getFullYear().toString();
  return fullYear.slice(-2);
}

function getMonthFormattedString(currentDate) {
  const month = currentDate.getMonth() + 1;
  return `0${month}`.slice(-2);
}

async function sendEmailToApprover(tenantDatabase, salesInvoice) {
  const tenantName = tenantDatabase.sequelize.config.database.replace('point_', '');
  // first time email
  await new ProcessSendCreateApprovalWorker({
    tenantName,
    salesInvoiceId: salesInvoice.id,
  }).call();
  // repeatable email
  const aDayInMiliseconds = 1000 * 60 * 60 * 24;
  await new ProcessSendCreateApprovalWorker({
    tenantName,
    salesInvoiceId: salesInvoice.id,
    options: {
      repeat: {
        every: aDayInMiliseconds,
        limit: 6,
      },
    },
  }).call();
}

module.exports = CreateFormRequest;
