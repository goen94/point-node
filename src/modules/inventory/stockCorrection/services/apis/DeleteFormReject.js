const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');

class DeleteFormReject {
  constructor(tenantDatabase, { approver, stockCorrectionId, deleteFormRejectDto }) {
    this.tenantDatabase = tenantDatabase;
    this.approver = approver;
    this.stockCorrectionId = stockCorrectionId;
    this.deleteFormRejectDto = deleteFormRejectDto;
  }

  async call() {
    const stockCorrection = await this.tenantDatabase.StockCorrection.findOne({
      where: { id: this.stockCorrectionId },
      include: [{ model: this.tenantDatabase.Form, as: 'form' }],
    });
    if (!stockCorrection) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Stock correction is not exist');
    }

    validate(stockCorrection.form, this.approver);

    const { form } = stockCorrection;
    await form.update({
      cancellationStatus: -1,
      cancellationApprovalAt: new Date(),
      cancellationApprovalBy: this.approver.id,
      cancellationApprovalReason: this.deleteFormRejectDto.reason,
    });

    return { stockCorrection };
  }
}

function validate(stockCorrectionForm, approver) {
  if (stockCorrectionForm.cancellationStatus !== 0) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Stock correction is not requested to be delete');
  }
  // super admin
  if (approver.modelHasRole?.role?.name === 'super admin') {
    return true;
  }
  if (stockCorrectionForm.requestApprovalTo !== approver.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden - You are not selected approver');
  }
}

module.exports = DeleteFormReject;
