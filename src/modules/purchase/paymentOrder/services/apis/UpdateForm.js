const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const validatePermission = require('@src/utils/permission');
const CheckJournal = require('./../CheckJournal');
const ProcessSendCreateApprovalWorker = require('../../workers/ProcessSendCreateApproval.worker');
const { Op } = require('sequelize');

class UpdateForm {
  constructor(tenantDatabase, { maker, paymentOrderId, updateFormDto }) {
    this.tenantDatabase = tenantDatabase;
    this.maker = maker;
    this.paymentOrderId = paymentOrderId;
    this.updateFormDto = updateFormDto;
  }

  async call() {
    const paymentOrderData = await this.tenantDatabase.PurchasePaymentOrder.findOne({
      where: { id: this.paymentOrderId },
      include: [
        {
          model: this.tenantDatabase.Form,
          as: 'form',
        }
      ]
    });

    if (!paymentOrderData) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Form not exist');
    }

    const paymentDetail = await this.tenantDatabase.PaymentDetail.findOne({
      where: {
        referenceableId: paymentOrderData.id,
        referenceableType: 'PurchasePaymentOrder',
      },
      include: [
        {
          model: this.tenantDatabase.Payment,
          as: 'payment',
          include: [
            {
              model: this.tenantDatabase.Form,
              as: 'form',
            }
          ]
        }
      ]
    });

    if (paymentDetail) {
      throw new ApiError(
        httpStatus.UNPROCESSABLE_ENTITY,
        `form already referenced with number ${paymentDetail.payment.form.number}`
      );
    }

    await validate(this.tenantDatabase, paymentOrderData.form, this.maker, this.updateFormDto);
    let paymentOrder, paymentOrderDetails, paymentOrderForm;
    await this.tenantDatabase.sequelize.transaction(async (transaction) => {
      ({ paymentOrder, paymentOrderDetails, paymentOrderForm } = await processCreatePaymentOrder(this.tenantDatabase, {
        updateFormDto: this.updateFormDto,
        maker: this.maker,
        transaction,
        oldForm: paymentOrderData.form,
      }));
    });

    const isEmailSent = await sendEmailToApprover(this.tenantDatabase, paymentOrder);

    return { paymentOrder, paymentOrderDetails, paymentOrderForm, isEmailSent };
  }
}

async function validate(tenantDatabase, form, maker, updateFormDto) {
  await validateBranch(tenantDatabase, form, maker);
  await validatePermission(tenantDatabase, { userId: maker.id, module: 'purchase payment order', action: 'update' });
  await validateData(updateFormDto);
}

async function validateBranch(tenantDatabase, form, maker) {
  const branchDefault = await tenantDatabase.BranchUser.findOne({
    where: { userId: maker.id, branchId: form.branchId, isDefault: 1 },
  });

  if (!branchDefault) {
    throw new ApiError(httpStatus.FORBIDDEN, 'please set default branch same as form to update this form');
  }

  maker.branchId = branchDefault.branchId;
}

async function validateData(updateFormDto) {
  const { supplierId, paymentType, invoices, downPayments, returns, others,
    date, requestApprovalTo, totalInvoiceAmount, totalDownPaymentAmount,
    totalReturnAmount, totalOtherAmount, totalAmount, notes } = updateFormDto;
  if (!supplierId || !paymentType || !invoices || !downPayments ||
      !returns || !others || !date || !requestApprovalTo || !totalInvoiceAmount ||
      !totalDownPaymentAmount || !totalReturnAmount || !totalOtherAmount || !totalAmount
    ) {
      throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Invalid data');
  }

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
  { updateFormDto, maker, transaction, oldForm }
) {
  console.log('masuk')
  const { paymentOrder, paymentOrderDetails} = await createPaymentOrder(tenantDatabase, {
    updateFormDto,
    oldForm,
    transaction,
  });
  const paymentOrderForm = await createPaymentOrderForm(tenantDatabase, {
    maker,
    updateFormDto,
    paymentOrder,
    oldForm,
  })

  return { paymentOrder, paymentOrderDetails, paymentOrderForm };
}

async function createPaymentOrder(tenantDatabase, { updateFormDto, oldForm, transaction }) {
  const paymentOrderData = await buildPaymentOrderData(tenantDatabase, { updateFormDto });
  const paymentOrder = await tenantDatabase.PurchasePaymentOrder.create(paymentOrderData, { transaction });
  const paymentOrderDetails = await addPaymentOrderDetails(tenantDatabase, { paymentOrder, updateFormDto, oldForm, transaction });

  return { paymentOrder, paymentOrderDetails };
}

async function buildPaymentOrderData(tenantDatabase, { updateFormDto }) {
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
  } = updateFormDto;

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
  { maker, updateFormDto, paymentOrder, oldForm }
) {
  const formData = await buildFormData(tenantDatabase, {
    maker,
    updateFormDto,
    paymentOrder,
    oldForm,
  });
  await oldForm.update({
    number: null,
    editedNumber: oldForm.number,
  })
  const form = await tenantDatabase.Form.create(formData);
  const { count } = await tenantDatabase.UserActivity.findAndCountAll({
    where: {
      number: form.number,
      activity: {
        [Op.like]: '%Update%'
      }
    }
  })
  const updatedCount = count + 1;
  await tenantDatabase.UserActivity.create({
    tableType: 'forms',
    tableId: form.id,
    number: form.number,
    date: new Date(),
    userId: maker.id,
    activity: 'Update - ' + updatedCount,
  });
  return form;
}

async function buildFormData(tenantDatabase, { maker, updateFormDto, paymentOrder, oldForm }) {
  const { notes, requestApprovalTo, date } = updateFormDto;
  const approver = await tenantDatabase.User.findOne({ where: { id: requestApprovalTo } });
  if (!approver) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Approver is not exist');
  }

  return {
    branchId: maker.branchId,
    date: date,
    number: oldForm.number,
    notes,
    createdBy: maker.id,
    updatedBy: maker.id,
    incrementNumber: oldForm.incrementNumber,
    incrementGroup: oldForm.incrementGroup,
    formableId: paymentOrder.id,
    formableType: 'PurchasePaymentOrder',
    requestApprovalTo,
  };
}

async function addPaymentOrderDetails(tenantDatabase, { paymentOrder, updateFormDto, oldForm, transaction }) {
  const { invoices, downPayments, returns, others } = updateFormDto;
  const paymentOrderInvoices = [];
  for (const invoice of invoices) {
    paymentOrderInvoices.push(
      await createPaymentOrderInvoices(tenantDatabase, { paymentOrder, invoice, oldForm, transaction })
    );
  }

  const paymentOrderDownPayments = [];
  for (const downPayment of downPayments) {
    paymentOrderDownPayments.push(
      await createPaymentOrderDownPayments(tenantDatabase, { paymentOrder, downPayment, oldForm, transaction })
    );
  }

  const paymentOrderReturns = [];
  for (const pReturn of returns) {
    paymentOrderReturns.push(
      await createPaymentOrderReturns(tenantDatabase, { paymentOrder, pReturn, oldForm, transaction, oldForm })
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

async function createPaymentOrderInvoices(tenantDatabase, { paymentOrder, invoice, oldForm, transaction }) {
  const available = await getAvailableInvoice(tenantDatabase, invoice.id, invoice.amount, paymentOrder.supplierId, oldForm);
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

async function createPaymentOrderDownPayments(tenantDatabase, { paymentOrder, downPayment, oldForm, transaction }) {
  const available = await getAvailableDownPayment(tenantDatabase, downPayment.id, downPayment.amount, paymentOrder.supplierId, oldForm);
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

  if (parseFloat(available) === parseFloat(downPayment.amount)) {
    const purchaseDownPayment = await paymentOrderDownPayment.getPurchaseDownPayment();
    const purchaseDownPaymentForm = await purchaseDownPayment.getForm();
    await purchaseDownPaymentForm.update({
      done: true,
    });
  }

  return paymentOrderDownPayment;
}

async function createPaymentOrderReturns(tenantDatabase, { paymentOrder, pReturn, oldForm, transaction }) {
  const available = await getAvailableReturn(tenantDatabase, pReturn.id, pReturn.amount, paymentOrder.supplierId, oldForm);
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

async function getAvailableInvoice(tenantDatabase, id, amount, supplierId, oldForm) {
  const purchaseInvoice = await tenantDatabase.PurchaseInvoice.findOne({
    where: { id },
    include: getIncludePaymentOrderDetails(tenantDatabase, oldForm),
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

async function getAvailableDownPayment(tenantDatabase, id, amount, supplierId, oldForm) {
  const purchaseDownPayment = await tenantDatabase.PurchaseDownPayment.findOne({
    where: { id },
    include: getIncludePaymentOrderDetails(tenantDatabase, oldForm),
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
    console.log('ada detail')
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

async function getAvailableReturn(tenantDatabase, id, amount, supplierId, oldForm) {
  const purchaseReturn = await tenantDatabase.PurchaseReturn.findOne({
    where: { id },
    include: getIncludePaymentOrderDetails(tenantDatabase, oldForm),
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

function getIncludePaymentOrderDetails(tenantDatabase, oldForm) {
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
          required: true,
          include: [
            {
              model: tenantDatabase.Form,
              as: 'form',
              where: { 
                cancellationStatus: {
                  [Op.or]: [{ [Op.is]: null },
                  { [Op.ne]: 1 }] 
                },
                number: {
                  [Op.ne]: oldForm.number,
                }
              }
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

module.exports = UpdateForm;