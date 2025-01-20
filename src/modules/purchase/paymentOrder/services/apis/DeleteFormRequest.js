const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
// const ProcessSendDeleteApprovalWorker = require('../../workers/ProcessSendDeleteApproval.worker');

class DeleteFormRequest {
  constructor(tenantDatabase, { maker, paymentOrderId, deleteFormRequestDto }) {
    this.tenantDatabase = tenantDatabase;
    this.maker = maker;
    this.paymentOrderId = paymentOrderId;
    this.deleteFormRequestDto = deleteFormRequestDto;
  }

  async call() {
    const paymentOrder = await this.tenantDatabase.PurchasePaymentOrder.findOne({
      where: { id: this.paymentOrderId },
      include: [{ model: this.tenantDatabase.Form, as: 'form' }],
    });

    await validate(this.tenantDatabase, paymentOrder, this.maker);

    const { form } = paymentOrder;
    await form.update({
      cancellationStatus: 0,
      requestCancellationBy: this.maker.id,
      requestCancellationTo: form.requestApprovalTo,
      requestCancellationReason: this.deleteFormRequestDto.reason,
      requestCancellationAt: new Date(),
    });

    //await sendEmailToApprover(this.tenantDatabase, paymentOrder);

    return { paymentOrder };
  }
}

async function validate(tenantDatabase, paymentOrder, maker) {
  if (!paymentOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'form not exist');
  }
  const { form } = paymentOrder;

  const paymentDetail = await tenantDatabase.PaymentDetail.findOne({
    where: {
      referenceableId: paymentOrder.id,
      referenceableType: 'PurchasePaymentOrder',
    },
    include: [
      {
        model: tenantDatabase.Payment,
        as: 'payment',
        include: [
          {
            model: tenantDatabase.Form,
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

  const branchDefault = await tenantDatabase.BranchUser.findOne({
    where: { userId: maker.id, branchId: form.branchId, isDefault: 1 },
  });

  if (!branchDefault) {
    throw new ApiError(httpStatus.FORBIDDEN, 'please set default branch same as form to update this form');
  }

  maker.branchId = branchDefault.branchId;
}

async function sendEmailToApprover(tenantDatabase, salesInvoice) {
  const tenantName = tenantDatabase.sequelize.config.database.replace('point_', '');
  // first time email
  await new ProcessSendDeleteApprovalWorker({
    tenantName,
    salesInvoiceId: salesInvoice.id,
  }).call();
  // repeatable email
  const aDayInMiliseconds = 1000 * 60 * 60 * 24;
  await new ProcessSendDeleteApprovalWorker({
    tenantName,
    salesInvoiceId: salesInvoice.id,
    options: {
      repeat: {
        every: aDayInMiliseconds,
        limit: 6,
      },
      jobId: `delete-email-approval-${salesInvoice.id}`,
    },
  }).call();
}

module.exports = DeleteFormRequest;