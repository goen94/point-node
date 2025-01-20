const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const ProcessSendUpdateApprovalWorker = require('../../workers/ProcessSendUpdateApproval.worker');

class UpdateForm {
  constructor(tenantDatabase, { maker, salesInvoiceId, updateFormDto }) {
    this.tenantDatabase = tenantDatabase;
    this.maker = maker;
    this.salesInvoiceId = salesInvoiceId;
    this.updateFormDto = updateFormDto;
  }

  async call() {
    const currentDate = new Date(Date.now());
    const salesInvoice = await this.tenantDatabase.SalesInvoice.findOne({
      where: { id: this.salesInvoiceId },
      include: [
        { model: this.tenantDatabase.Form, as: 'form' },
        { model: this.tenantDatabase.SalesInvoiceItem, as: 'items' },
      ],
    });
    const { form } = salesInvoice;
    validate(form, this.maker);

    await deleteJournal(this.tenantDatabase, form);
    await deleteInventory(this.tenantDatabase, form);
    await updateSalesInvoice(salesInvoice, this.updateFormDto);
    await updateSalesInvoiceForm({
      maker: this.maker,
      updateFormDto: this.updateFormDto,
      salesInvoice,
      currentDate,
      form,
    });
    await salesInvoice.reload();
    await sendEmailToApprover(this.tenantDatabase, salesInvoice);

    return { salesInvoice };
  }
}

function validate(form, maker) {
  if (maker.modelHasRole?.role?.name === 'super admin') {
    return true;
  }
  if (form.createdBy !== maker.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden - Only maker can update the invoice');
  }
}

async function updateSalesInvoice(salesInvoice, updateFormDto) {
  const salesInvoiceData = await buildSalesInvoiceData(salesInvoice, updateFormDto);
  await salesInvoice.update(salesInvoiceData);
  await salesInvoice.reload();

  return salesInvoice;
}

async function buildSalesInvoiceData(salesInvoice, updateFormDto) {
  const { dueDate, typeOfTax, items: updateItemsData, discountPercent, discountValue } = updateFormDto;
  const { items: currentItems } = salesInvoice;

  await updateItems(currentItems, updateItemsData);

  const items = await salesInvoice.getItems();
  const subTotal = getSubTotal(items);
  const taxBase = getTaxBase(subTotal, discountValue, discountPercent);
  const tax = getTax(taxBase, typeOfTax);
  const amount = getAmount(taxBase, tax, typeOfTax);

  return {
    dueDate,
    discountPercent,
    discountValue,
    tax,
    typeOfTax,
    amount,
    remaining: amount,
  };
}

async function updateItems(currentItems, updateItemsData) {
  const doUpdateItem = updateItemsData.map((updateItem) => {
    const item = currentItems.find((currentItem) => {
      return currentItem.id === updateItem.salesInvoiceItemId;
    });

    return item.update({
      discountPercent: updateItem.discountPercent,
      discountValue: updateItem.discountValue,
      price: updateItem.price,
      allocationId: updateItem.allocationId,
    });
  });

  await Promise.all(doUpdateItem);
}

function getSubTotal(items) {
  const subTotal = items.reduce((result, item) => {
    return result + getItemsPrice(item);
  }, 0);

  return subTotal;
}

function getItemsPrice(item) {
  let perItemPrice = item.price;
  let discount = 0;
  if (item.discountPercent > 0) {
    discount = (item.discountPercent / 100) * item.price;
  } else if (item.discountValue > 0) {
    discount = item.discountValue;
  }
  perItemPrice -= discount;
  const totalItemPrice = perItemPrice * item.quantity;

  return totalItemPrice;
}

function getTaxBase(subTotal, discountValue, discountPercent) {
  let result = subTotal;
  if (discountPercent > 0) {
    result = subTotal - subTotal * (discountPercent / 100);
  } else if (discountValue > 0) {
    result = subTotal - discountValue;
  }

  return result;
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

function getAmount(taxBase, tax, typeOfTax) {
  if (typeOfTax === 'exclude') {
    return taxBase + tax;
  }

  return taxBase;
}

async function updateSalesInvoiceForm({ maker, updateFormDto, form }) {
  const formData = await buildFormData({ maker, updateFormDto });
  await form.update(formData);
  await form.reload();

  return form;
}

async function buildFormData({ maker, updateFormDto }) {
  const { notes, requestApprovalTo } = updateFormDto;

  return {
    date: new Date(),
    notes,
    updatedBy: maker.id,
    requestApprovalTo,
    done: false,
    approvalStatus: 0,
    approvalReason: null,
    cancellationStatus: null,
    requestCancellationTo: null,
  };
}

async function deleteJournal(tenantDatabase, form) {
  await tenantDatabase.Journal.destroy({ where: { formId: form.id } });
}

function deleteInventory(tenantDatabase, form) {
  return tenantDatabase.Inventory.destroy({ where: { formId: form.id } });
}

async function sendEmailToApprover(tenantDatabase, salesInvoice) {
  const tenantName = tenantDatabase.sequelize.config.database.replace('point_', '');
  await new ProcessSendUpdateApprovalWorker({
    tenantName,
    salesInvoiceId: salesInvoice.id,
  }).call();
}

module.exports = UpdateForm;
