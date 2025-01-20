const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');

class DeleteFormReject {
  constructor(tenantDatabase, { approver, paymentOrderId, deleteFormRejectDto }) {
    this.tenantDatabase = tenantDatabase;
    this.approver = approver;
    this.paymentOrderId = paymentOrderId;
    this.deleteFormRejectDto = deleteFormRejectDto;
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
    await form.update({
      cancellationStatus: -1,
      cancellationApprovalAt: new Date(),
      cancellationApprovalBy: this.approver.id,
      cancellationApprovalReason: this.deleteFormRejectDto.reason,
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

module.exports = DeleteFormReject;