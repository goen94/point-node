const { Op } = require('sequelize');
const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const validatePermission = require('@src/utils/permission');
const CheckJournal = require('./../CheckJournal');
const ProcessSendCreateApprovalWorker = require('../../workers/ProcessSendCreateApproval.worker');

class CreateFormRequest {
  constructor(tenantDatabase, { maker, createFormRequestDto }) {
    this.tenantDatabase = tenantDatabase;
    this.maker = maker;
    this.createFormRequestDto = createFormRequestDto;
  }

  async call() {
    let paymentOrder, paymentOrderDetails, paymentOrderForm;
    await validate(this.tenantDatabase, this.maker, this.createFormRequestDto);
    await this.tenantDatabase.sequelize.transaction(async (transaction) => {
      ({ paymentOrder, paymentOrderDetails, paymentOrderForm } = await processCreatePaymentOrder(this.tenantDatabase, {
        createFormRequestDto: this.createFormRequestDto,
        maker: this.maker,
        transaction,
      }));
    });

    const isEmailSent = await sendEmailToApprover(this.tenantDatabase, paymentOrder);

    return { paymentOrder, paymentOrderDetails, paymentOrderForm, isEmailSent };
  }
  
}

async function validate(tenantDatabase, maker, createFormRequestDto) {
  await validateBranch(tenantDatabase, maker);
  await validatePermission(tenantDatabase, { userId: maker.id, module: 'purchase payment order', action: 'create' });
  await validateData(createFormRequestDto);
}

async function validateBranch(tenantDatabase, maker) {
  const branchDefault = await tenantDatabase.BranchUser.findOne({
    where: { userId: maker.id, isDefault: 1 },
  });

  if (!branchDefault) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'please set default branch to create this form');
  }

  maker.branchId = branchDefault.branchId;
}

async function validateData(createFormRequestDto) {
  const { notes } = createFormRequestDto;

  if (notes) {
    if (notes.length > 255) {
      throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'notes can\'t more than 255 character');
    }

    if (notes.charAt(0) === ' ' ||
      notes.charAt(notes.length - 1) === ' ') {
      throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'notes can\'t have space at start or end');
    }
  }
}

async function processCreatePaymentOrder(
  tenantDatabase,
  { createFormRequestDto, maker, transaction }
) {
  const { paymentOrder, paymentOrderDetails} = await createPaymentOrder(tenantDatabase, {
    createFormRequestDto,
    transaction,
  });
  const paymentOrderForm = await createPaymentOrderForm(tenantDatabase, {
    maker,
    createFormRequestDto,
    paymentOrder,
    transaction,
  })

  return { paymentOrder, paymentOrderDetails, paymentOrderForm };
}

async function createPaymentOrder(tenantDatabase, { createFormRequestDto, transaction }) {
  const paymentOrderData = await buildPaymentOrderData(tenantDatabase, { createFormRequestDto });
  const paymentOrder = await tenantDatabase.PurchasePaymentOrder.create(paymentOrderData, { transaction });
  const paymentOrderDetails = await addPaymentOrderDetails(tenantDatabase, { paymentOrder, createFormRequestDto, transaction });

  return { paymentOrder, paymentOrderDetails };
}

async function buildPaymentOrderData(tenantDatabase, { createFormRequestDto }) {
  const { 
    paymentType,
    supplierId,
    totalInvoiceAmount,
    totalDownPaymentAmount,
    totalReturnAmount,
    totalOtherAmount,
    totalAmount,
    invoices,
    downPayments,
    returns,
    others,
  } = createFormRequestDto;

  const supplier = await getSupplier(tenantDatabase, supplierId);
  await validateInvoices(invoices, totalInvoiceAmount);
  await validateDownPayments(downPayments, totalDownPaymentAmount);
  await validateReturns(returns, totalReturnAmount);
  const totalOther = await validateOthers(tenantDatabase, others, totalOtherAmount);

  if (totalDownPaymentAmount > totalInvoiceAmount) {
    throw new ApiError(
      httpStatus.UNPROCESSABLE_ENTITY,
      `total down payment more than total invoice, total down payment: ${totalDownPaymentAmount} > total invoice: ${totalInvoiceAmount}`
    );
  }
  if (totalReturnAmount > totalInvoiceAmount) {
    throw new ApiError(
      httpStatus.UNPROCESSABLE_ENTITY,
      `total return more than total invoice, total return: ${totalReturnAmount} > total invoice: ${totalInvoiceAmount}`
    );
  }
  const amount = totalInvoiceAmount - totalDownPaymentAmount - totalReturnAmount + totalOther;

  if (amount != totalAmount) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, `incorect total amount, expected ${amount} received ${totalAmount}`);
  }

  const { isBalance } = await new CheckJournal(tenantDatabase, {
    amount,
    invoices,
    downPayments,
    returns,
    others,
  }).call();

  if (!isBalance) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'journal not balance');
  }
  
  return {
    paymentType,
    supplierId: supplier.id,
    supplierName: supplier.name,
    amount,
  };
}

async function createPaymentOrderForm(
  tenantDatabase,
  { maker, createFormRequestDto, paymentOrder }
) {
  const formData = await buildFormData(tenantDatabase, {
    maker,
    createFormRequestDto,
    paymentOrder
  });
  const form = await tenantDatabase.Form.create(formData);
  await tenantDatabase.UserActivity.create({
    tableType: 'forms',
    tableId: form.id,
    number: form.number,
    date: new Date(),
    userId: maker.id,
    activity: 'Created',
  });
  return form;
}

async function buildFormData(tenantDatabase, { maker, createFormRequestDto, paymentOrder }) {
  const { notes, requestApprovalTo, date } = createFormRequestDto;
  const { incrementNumber, incrementGroup } = await getFormIncrement(tenantDatabase, date);
  const formNumber = generateFormNumber(date, incrementNumber);
  const approver = await tenantDatabase.User.findOne({ where: { id: requestApprovalTo } });
  if (!approver) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Approver is not exist');
  }

  return {
    branchId: maker.branchId,
    date: createFormRequestDto.date,
    number: formNumber,
    notes,
    createdBy: maker.id,
    updatedBy: maker.id,
    incrementNumber,
    incrementGroup,
    formableId: paymentOrder.id,
    formableType: 'PurchasePaymentOrder',
    requestApprovalTo,
  };
}

async function getFormIncrement(tenantDatabase, date) {
  const incrementGroup = Number(`${date.getFullYear()}${getMonthFormattedString(date)}`);
  const lastForm = await tenantDatabase.Form.findOne({
    where: {
      formableType: 'PurchasePaymentOrder',
      incrementGroup,
    },
    order: [['increment', 'DESC']],
  });

  return {
    incrementGroup,
    incrementNumber: lastForm ? lastForm.incrementNumber + 1 : 1,
  };
}

function generateFormNumber(date, incrementNumber) {
  const monthValue = getMonthFormattedString(date);
  const yearValue = getYearFormattedString(date);
  const orderNumber = `000${incrementNumber}`.slice(-3);
  return `PP${yearValue}${monthValue}${orderNumber}`;
}

function getYearFormattedString(date) {
  const fullYear = date.getFullYear().toString();
  return fullYear.slice(-2);
}

function getMonthFormattedString(date) {
  const month = date.getMonth() + 1;
  return `0${month}`.slice(-2);
}

async function addPaymentOrderDetails(tenantDatabase, { paymentOrder, createFormRequestDto, transaction }) {
  const { invoices, downPayments, returns, others } = createFormRequestDto;
  const paymentOrderInvoices = [];
  for (const invoice of invoices) {
    paymentOrderInvoices.push(
      await createPaymentOrderInvoices(tenantDatabase, { paymentOrder, invoice, transaction })
    );
  }

  const paymentOrderDownPayments = [];
  for (const downPayment of downPayments) {
    paymentOrderDownPayments.push(
      await createPaymentOrderDownPayments(tenantDatabase, { paymentOrder, downPayment, transaction })
    );
  }

  const paymentOrderReturns = [];
  for (const pReturn of returns) {
    paymentOrderReturns.push(
      await createPaymentOrderReturns(tenantDatabase, { paymentOrder, pReturn, transaction })
    );
  }

  const paymentOrderOthers = [];
  for (const other of others) {
    paymentOrderOthers.push(
      await createPaymentOrderOthers(tenantDatabase, { paymentOrder, other, transaction })
    );
  }

  return { paymentOrderInvoices, paymentOrderDownPayments, paymentOrderReturns, paymentOrderOthers }
}

async function createPaymentOrderInvoices(tenantDatabase, { paymentOrder, invoice, transaction }) {
  const available = await getAvailableInvoice(tenantDatabase, invoice.id, invoice.amount, paymentOrder.supplierId);
  const paymentOrderInvoice = await tenantDatabase.PurchasePaymentOrderDetails.create(
    {
      purchasePaymentOrderId: paymentOrder.id,
      available,
      amount: invoice.amount,
      referenceableId: invoice.id,
      referenceableType: 'PurchaseInvoice',
    }, 
    { transaction }
  );

  if (parseFloat(available) === parseFloat(invoice.amount)) {
    const purchaseInvoice = await paymentOrderInvoice.getPurchaseInvoice();
    const purchaseInvoiceForm = await purchaseInvoice.getForm();
    await purchaseInvoiceForm.update({
      done: true,
    });
  }

  return paymentOrderInvoice;
}

async function createPaymentOrderDownPayments(tenantDatabase, { paymentOrder, downPayment, transaction }) {
  const available = await getAvailableDownPayment(tenantDatabase, downPayment.id, downPayment.amount, paymentOrder.supplierId);
  const paymentOrderDownPayment = await tenantDatabase.PurchasePaymentOrderDetails.create(
    {
      purchasePaymentOrderId: paymentOrder.id,
      available,
      amount: downPayment.amount,
      referenceableId: downPayment.id,
      referenceableType: 'PurchaseDownPayment',
    }, 
    { transaction }
  );
  console.log(parseFloat(available));
  console.log(parseFloat(downPayment.amount));
  if (parseFloat(available) === parseFloat(downPayment.amount)) {
    const purchaseDownPayment = await paymentOrderDownPayment.getPurchaseDownPayment();
    const purchaseDownPaymentForm = await purchaseDownPayment.getForm();
    await purchaseDownPaymentForm.update({
      done: true,
    });
  }

  return paymentOrderDownPayment;
}

async function createPaymentOrderReturns(tenantDatabase, { paymentOrder, pReturn, transaction }) {
  const available = await getAvailableReturn(tenantDatabase, pReturn.id, pReturn.amount, paymentOrder.supplierId);
  const paymentOrderReturn = await  tenantDatabase.PurchasePaymentOrderDetails.create(
    {
      purchasePaymentOrderId: paymentOrder.id,
      available,
      amount: pReturn.amount,
      referenceableId: pReturn.id,
      referenceableType: 'PurchaseReturn',
    }, 
    { transaction }
  );

  if (parseFloat(available) === parseFloat(pReturn.amount)) {
    const purchaseReturn = await paymentOrderReturn.getPurchaseReturn();
    const purchaseReturnForm = await purchaseReturn.getForm();
    await purchaseReturnForm.update({
      done: true,
    });
  }

  return paymentOrderReturn;
}

async function createPaymentOrderOthers(tenantDatabase, { paymentOrder, other, transaction }) {
  return tenantDatabase.PurchasePaymentOrderDetails.create(
    {
      purchasePaymentOrderId: paymentOrder.id,
      chartOfAccountId: other.coaId,
      allocationId: other.allocationId,
      amount: other.amount,
      notes: other.notes,
    }, 
    { transaction }
  );
}

async function getSupplier(tenantDatabase, supplierId) {
  const supplier = await tenantDatabase.Supplier.findOne({ where: { id: supplierId } });
  if (!supplier) {
    throw new ApiError(httpStatus.NOT_FOUND, 'supplier not exist');
  }
  return supplier;
}

async function validateOthers(tenantDatabase, others, totalOtherAmount) {
  let total = 0;
  for (const other of others) {
    const coa = await tenantDatabase.ChartOfAccount.findOne({
      where: { id: other.coaId },
      include: [
        {
          model: tenantDatabase.ChartOfAccountType,
          as: 'type',
        },
      ],
    });
    if (!coa) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `chart of account with id ${other.coaId} not found`
      );
    }
    if (coa.type.isDebit) {
      total = parseFloat(total) + parseFloat(other.amount);
    } else {
      total = parseFloat(total) - parseFloat(other.amount);
    }
  }

  if (totalOtherAmount != Math.abs(total)) {
    throw new ApiError(
      httpStatus.UNPROCESSABLE_ENTITY,
      `incorect total other amount, expected ${Math.abs(total)} received ${totalOtherAmount}`
    );
  }

  return total;
}

async function validateInvoices(invoices, totalInvoiceAmount) {
  let total = 0;
  for (const invoice of invoices) {
    total = parseFloat(total) + parseFloat(invoice.amount);
  }

  if (total != totalInvoiceAmount) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, `incorect total invoice amount, expected ${total} received ${totalInvoiceAmount}`);
  }
}

async function getAvailableInvoice(tenantDatabase, id, amount, supplierId) {
  const purchaseInvoice = await tenantDatabase.PurchaseInvoice.findOne({
    where: { id },
    include: getIncludePaymentOrderDetails(tenantDatabase),
  });
  if (!purchaseInvoice) {
    throw new ApiError(httpStatus.NOT_FOUND, `purchase invoice with id ${id} not exist`);
  }
  if (purchaseInvoice.supplierId != supplierId) {
    throw new ApiError(
      httpStatus.UNPROCESSABLE_ENTITY,
      `invalid supplier for form ${purchaseInvoice.form.number}`
    );
  }

  let available = purchaseInvoice.amount;
  purchaseInvoice.paymentOrderDetails.forEach(paymentOrderDetail => {
    available = parseFloat(available) - parseFloat(paymentOrderDetail.amount);
  });
  if (available < amount) {
    throw new ApiError(
      httpStatus.UNPROCESSABLE_ENTITY,
      `form ${purchaseInvoice.form.number} order more than available, available ${parseFloat(available)} ordered ${amount}`
    );
  }

  return available;
}

async function validateDownPayments(downPayments, totalDownPaymentAmount) {
  let total = 0
  for (const downPayment of downPayments) {
    total = parseFloat(total) + parseFloat(downPayment.amount);
  }
  if (total != totalDownPaymentAmount) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, `incorect total down payment amount, expected ${total} received ${totalDownPaymentAmount}`);
  }
}

async function getAvailableDownPayment(tenantDatabase, id, amount, supplierId) {
  const purchaseDownPayment = await tenantDatabase.PurchaseDownPayment.findOne({
    where: { id },
    include: getIncludePaymentOrderDetails(tenantDatabase),
  });
  if (!purchaseDownPayment) {
    throw new ApiError(httpStatus.NOT_FOUND, `purchase down payment with id ${id} not exist`);
  }
  if (purchaseDownPayment.supplierId != supplierId) {
    throw new ApiError(
      httpStatus.UNPROCESSABLE_ENTITY,
      `invalid supplier for form ${purchaseDownPayment.form.number}`
    );
  }

  let available = purchaseDownPayment.amount;
  purchaseDownPayment.paymentOrderDetails.forEach(paymentOrderDetail => {
    available = parseFloat(available) - parseFloat(paymentOrderDetail.amount);
  });
  if (available < amount) {
    throw new ApiError(
      httpStatus.UNPROCESSABLE_ENTITY,
      `form ${purchaseDownPayment.form.number} order more than available, available ${parseFloat(available)} ordered ${amount}`
    );
  }

  return available;
}

async function validateReturns(returns, totalReturnAmount) {
  let total = 0
  for (const pReturn of returns) {
    total = parseFloat(total) + parseFloat(pReturn.amount);
  }
  if (total != totalReturnAmount ) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, `incorect total return amount, expected ${total} received ${totalReturnAmount}`);
  }
}

async function getAvailableReturn(tenantDatabase, id, amount, supplierId) {
  const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne({
    where: { id },
    include: getIncludePaymentOrderDetails(tenantDatabase),
  });
  if (!purchaseReturn) {
    throw new ApiError(httpStatus.NOT_FOUND, `purchase return with id ${id} not exist`);
  }
  if (purchaseReturn.supplierId != supplierId) {
    throw new ApiError(
      httpStatus.UNPROCESSABLE_ENTITY,
      `invalid supplier for form ${purchaseReturn.form.number}`
    );
  }

  let available = purchaseReturn.amount;
  purchaseReturn.paymentOrderDetails.forEach(purchaseReturn => {
    available = parseFloat(available) - parseFloat(purchaseReturn.amount);
  });
  if (available < amount) {
    throw new ApiError(
      httpStatus.UNPROCESSABLE_ENTITY,
      `form ${purchaseReturn.form.number} order more than available, available ${parseFloat(available)} ordered ${amount}`
    );
  }

  return available;
}

function getIncludePaymentOrderDetails(tenantDatabase) {
  return [
    {
      model: tenantDatabase.Form,
      as: 'form',
      where: { approvalStatus: 1 }
    },
    {
      model: tenantDatabase.PurchasePaymentOrderDetails,
      as: 'paymentOrderDetails',
      required: false,
      include: [
        {
          model: tenantDatabase.PurchasePaymentOrder,
          as: 'purchasePaymentOrder',
          include: [
            {
              model: tenantDatabase.Form,
              as: 'form',
              where: { cancellationStatus: { [Op.or]: [{ [Op.is]: null }, { [Op.ne]: 1 }] } }
            },
          ]
        }
      ]
    }
  ]
}

async function sendEmailToApprover(tenantDatabase, paymentOrder) {
  // first time email
  new ProcessSendCreateApprovalWorker({
    tenantDatabase,
    paymentOrderId: paymentOrder.id,
  }).call();
  // repeatable email
  const aDayInMiliseconds = 1000 * 60 * 60 * 24;
  new ProcessSendCreateApprovalWorker({
    tenantDatabase,
    paymentOrderId: paymentOrder.id,
    options: {
      repeat: {
        every: aDayInMiliseconds, // 1 day
        limit: 7,
      },
    },
  }).call();

  return true;
}

module.exports = CreateFormRequest;