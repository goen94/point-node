const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');

class DeleteFormApprove {
  constructor(tenantDatabase, { approver, stockCorrectionId }) {
    this.tenantDatabase = tenantDatabase;
    this.approver = approver;
    this.stockCorrectionId = stockCorrectionId;
  }

  async call() {
    const stockCorrection = await this.tenantDatabase.StockCorrection.findOne({
      where: { id: this.stockCorrectionId },
      include: [
        { model: this.tenantDatabase.Form, as: 'form' },
        { model: this.tenantDatabase.StockCorrectionItem, as: 'items' },
      ],
    });
    if (!stockCorrection) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Stock correction is not exist');
    }

    validate(stockCorrection.form, this.approver);

    const { form } = stockCorrection;
    await deleteInventory(this.tenantDatabase, form);
    await deleteJournal(this.tenantDatabase, form);
    await updateForm(form, this.approver);

    return { stockCorrection };
  }
}

function validate(stockCorrectionForm, approver) {
  if (stockCorrectionForm.cancellationStatus !== 0) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Stock correction is not requested to be delete');
  }
  if (stockCorrectionForm.done) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Can not delete already referenced stock correction');
  }
  // super admin
  if (approver.modelHasRole?.role?.name === 'super admin') {
    return true;
  }
  if (stockCorrectionForm.requestApprovalTo !== approver.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden - You are not selected approver');
  }
}

async function deleteJournal(tenantDatabase, form) {
  await tenantDatabase.Journal.destroy({ where: { formId: form.id } });
}

function deleteInventory(tenantDatabase, form) {
  return tenantDatabase.Inventory.destroy({ where: { formId: form.id } });
}

async function updateForm(form, approver) {
  await form.update({
    cancellationStatus: 1,
    cancellationApprovalAt: new Date(),
    cancellationApprovalBy: approver.id,
  });
}

module.exports = DeleteFormApprove;
