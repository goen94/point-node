const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');

class DeleteFormReject {
  constructor(tenantDatabase, { approver, salesInvoiceId, deleteFormRejectDto }) {
    this.tenantDatabase = tenantDatabase;
    this.approver = approver;
    this.salesInvoiceId = salesInvoiceId;
    this.deleteFormRejectDto = deleteFormRejectDto;
  }

  async call() {
    const salesInvoice = await this.tenantDatabase.SalesInvoice.findOne({
      where: { id: this.salesInvoiceId },
      include: [{ model: this.tenantDatabase.Form, as: 'form' }],
    });

    validate(salesInvoice, this.approver);

    const { form } = salesInvoice;
    await form.update({
      cancellationStatus: -1,
      cancellationApprovalAt: new Date(),
      cancellationApprovalBy: this.approver.id,
      cancellationApprovalReason: this.deleteFormRejectDto.reason,
    });

    return { salesInvoice };
  }
}

function validate(salesInvoice, approver) {
  if (!salesInvoice) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sales invoice is not exist');
  }
  const { form } = salesInvoice;
  if (form.cancellationStatus !== 0) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Sales invoice is not requested to be delete');
  }
  // super admin
  if (approver.modelHasRole?.role?.name === 'super admin') {
    return true;
  }
  if (form.requestApprovalTo !== approver.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden - You are not the selected approver');
  }
}

module.exports = DeleteFormReject;
