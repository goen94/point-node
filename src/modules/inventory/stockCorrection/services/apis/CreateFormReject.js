const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');

class CreateFormReject {
  constructor(tenantDatabase, { approver, stockCorrectionId, createFormRejectDto }) {
    this.tenantDatabase = tenantDatabase;
    this.approver = approver;
    this.stockCorrectionId = stockCorrectionId;
    this.createFormRejectDto = createFormRejectDto;
  }

  async call() {
    const stockCorrection = await this.tenantDatabase.StockCorrection.findOne({
      where: { id: this.stockCorrectionId },
      include: [{ model: this.tenantDatabase.Form, as: 'form' }],
    });
    if (!stockCorrection) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Stock correction is not exist');
    }

    const { form } = stockCorrection;
    validate({ form, stockCorrection, approver: this.approver });
    if (form.approvalStatus === -1) {
      return { stockCorrection };
    }

    const { reason: approvalReason } = this.createFormRejectDto;
    await form.update({
      approvalStatus: -1,
      approvalBy: this.approver.id,
      approvalAt: new Date(),
      approvalReason,
    });

    stockCorrection.reload();
    return { stockCorrection };
  }
}

function validate({ form, approver }) {
  if (form.approvalStatus === 1) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Stock correction already approved');
  }
  // super admin
  if (approver.modelHasRole?.role?.name === 'super admin') {
    return true;
  }
  if (form.requestApprovalTo !== approver.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
}

module.exports = CreateFormReject;
