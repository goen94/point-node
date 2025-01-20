const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');

class CreateFormReject {
  constructor(tenantDatabase, { approver, salesInvoiceId, createFormRejectDto }) {
    this.tenantDatabase = tenantDatabase;
    this.approver = approver;
    this.salesInvoiceId = salesInvoiceId;
    this.createFormRejectDto = createFormRejectDto;
  }

  async call() {
    const salesInvoice = await this.tenantDatabase.SalesInvoice.findOne({
      where: { id: this.salesInvoiceId },
      include: [{ model: this.tenantDatabase.Form, as: 'form' }],
    });
    if (!salesInvoice) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Sales invoice is not exist');
    }
    const { form } = salesInvoice;

    validate({ form, salesInvoice, approver: this.approver });

    const { reason: approvalReason } = this.createFormRejectDto;

    await form.update({
      approvalStatus: -1,
      approvalBy: this.approver.id,
      approvalAt: new Date(),
      approvalReason,
    });

    salesInvoice.reload();
    return { salesInvoice };
  }
}

function validate({ form, salesInvoice, approver }) {
  if (form.approvalStatus === -1) {
    return { salesInvoice };
  }
  if (form.approvalStatus === 1) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Sales invoice already approved');
  }
  // super admin
  if (approver.modelHasRole?.role?.name === 'super admin') {
    return true;
  }
  if (form.requestApprovalTo !== approver.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden - You are not the selected approver');
  }
}

module.exports = CreateFormReject;
