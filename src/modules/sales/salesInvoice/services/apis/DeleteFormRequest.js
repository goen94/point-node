const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const ProcessSendDeleteApprovalWorker = require('../../workers/ProcessSendDeleteApproval.worker');

class DeleteFormRequest {
  constructor(tenantDatabase, { maker, salesInvoiceId, deleteFormRequestDto }) {
    this.tenantDatabase = tenantDatabase;
    this.maker = maker;
    this.salesInvoiceId = salesInvoiceId;
    this.deleteFormRequestDto = deleteFormRequestDto;
  }

  async call() {
    const salesInvoice = await this.tenantDatabase.SalesInvoice.findOne({
      where: { id: this.salesInvoiceId },
      include: [{ model: this.tenantDatabase.Form, as: 'form' }],
    });

    validate(salesInvoice, this.maker);

    const { form } = salesInvoice;
    await form.update({
      cancellationStatus: 0,
      requestCancellationBy: this.maker.id,
      requestCancellationTo: form.requestApprovalTo,
      requestCancellationReason: this.deleteFormRequestDto.reason,
      requestCancellationAt: new Date(),
    });

    await sendEmailToApprover(this.tenantDatabase, salesInvoice);

    return { salesInvoice };
  }
}

function validate(salesInvoice, maker) {
  if (!salesInvoice) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sales invoice is not exist');
  }
  const { form } = salesInvoice;
  if (form.done === true) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Can not delete already referenced sales invoice');
  }
  if (maker.modelHasRole?.role?.name === 'super admin') {
    return true;
  }
  if (form.createdBy !== maker.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden - Only maker can delete the invoice');
  }
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
