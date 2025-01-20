const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');

class DeleteFormApprove {
  constructor(tenantDatabase, { approver, paymentOrderId }) {
    this.tenantDatabase = tenantDatabase;
    this.approver = approver;
    this.paymentOrderId = paymentOrderId;
  }

  async call() {
    const paymentOrder = await this.tenantDatabase.PurchasePaymentOrder.findOne({
      where: { id: this.paymentOrderId },
      include: [
        { model: this.tenantDatabase.Form, as: 'form' },
      ],
    });

    validate(paymentOrder, this.approver);

    const { form } = paymentOrder;
    await this.tenantDatabase.sequelize.transaction(async (transaction) => {
      await form.update(
        {
          cancellationStatus: 1,
          cancellationApprovalAt: new Date(),
          cancellationApprovalBy: this.approver.id,
        },
        { transaction }
      );

      await this.tenantDatabase.UserActivity.create(
        {
          tableType: 'forms',
          tableId: form.id,
          number: form.number,
          date: new Date(),
          userId: this.approver.id,
          activity: 'Cancelled',
        },
        { transaction }
      );

      await updateReferences(paymentOrder, transaction);
    });

    return { paymentOrder };
  }
}

function validate(paymentOrder, approver) {
  if (!paymentOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'form not exist');
  }
  const { form } = paymentOrder;
  if (form.cancellationStatus !== 0) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'form not requested to be delete');
  }
  if (form.requestApprovalTo !== approver.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden - You are not the selected approver');
  }
}

async function updateReferences(paymentOrder, transaction) {
  const invoices = await paymentOrder.getInvoices();
  const downPayments = await paymentOrder.getDownPayments();
  const returns = await paymentOrder.getReturns();

  for (const invoice of invoices) {
    const purchaseInvoice = await invoice.getPurchaseInvoice();
    const form = await purchaseInvoice.getForm();
    if (form.done === true) {
      await form.update(
        {
          done: false
        },
        { transaction }
      );
    }
  }

  for (const downPayment of downPayments) {
    const purchaseDownPayment = await downPayment.getPurchaseDownPayment();
    const form = await purchaseDownPayment.getForm();
    if (form.done === true) {
      await form.update(
        {
          done: false
        },
        { transaction }
      );
    }
  }

  for (const pReturn of returns) {
    const purchaseReturn = await pReturn.getPurchaseReturn();
    const form = await purchaseReturn.getForm();
    if (form.done === true) {
      await form.update(
        {
          done: false
        },
        { transaction }
      );
    }
  }
}

module.exports = DeleteFormApprove;