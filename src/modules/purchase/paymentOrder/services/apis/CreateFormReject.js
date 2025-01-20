const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');

class CreateFormReject {
  constructor(tenantDatabase, { approver, paymentOrderId, createFormRejectDto }) {
    this.tenantDatabase = tenantDatabase;
    this.approver = approver;
    this.paymentOrderId = paymentOrderId;
    this.createFormRejectDto = createFormRejectDto;
  }

  async call() {
    const paymentOrder = await this.tenantDatabase.PurchasePaymentOrder.findOne({
      where: { id: this.paymentOrderId },
      include: [{ model: this.tenantDatabase.Form, as: 'form' }],
    });
    if (!paymentOrder) {
      throw new ApiError(httpStatus.NOT_FOUND, 'form not exist');
    }
    const { form } = paymentOrder;

    validate({ form, paymentOrder, approver: this.approver });

    const { reason: approvalReason } = this.createFormRejectDto;

    await this.tenantDatabase.sequelize.transaction(async (transaction) => {
      await form.update(
        {
          approvalStatus: -1,
          approvalBy: this.approver.id,
          approvalAt: new Date(),
          approvalReason,
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
          activity: 'Rejected',
        },
        { transaction }
      );
    });

    paymentOrder.reload();
    return { paymentOrder };
  }
}

function validate({ form, paymentOrder, approver }) {
  if (form.approvalStatus === -1) {
    return { paymentOrder };
  }
  if (form.approvalStatus === 1) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'form already approved');
  }
  if (form.requestApprovalTo !== approver.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden - You are not the selected approver');
  }
}

function generatePaymentOrderIncludes(tenantDatabase) {
  return [
    {
      model: tenantDatabase.PurchasePaymentOrderDetails,
      as: 'invoices',
      include: [
        {
          model: tenantDatabase.PurchaseInvoice,
          as: 'purchaseInvoice',
          include: [{ model: tenantDatabase.Form, as: 'form' }],
        }
      ],
    },
    {
      model: tenantDatabase.PurchasePaymentOrderDetails,
      as: 'downPayments',
      include: [
        {
          model: tenantDatabase.PurchaseDownPayment,
          as: 'purchaseDownPayment',
          include: [{ model: tenantDatabase.Form, as: 'form' }],
        }
      ],
    },
    {
      model: tenantDatabase.PurchasePaymentOrderDetails,
      as: 'returns',
      include: [
        {
          model: tenantDatabase.PurchaseReturn,
          as: 'purchaseReturn',
          include: [{ model: tenantDatabase.Form, as: 'form' }],
        }
      ],
    },
    {
      model: tenantDatabase.PurchasePaymentOrderDetails,
      as: 'others',
      include: [
        {
          model: tenantDatabase.ChartOfAccount,
          as: 'chartOfAccount',
        },
        {
          model: tenantDatabase.Allocation,
          as: 'allocation',
        }
      ],
    },
    {
      model: tenantDatabase.Form,
      as: 'form',
      include: [
        { model: tenantDatabase.User, as: 'requestApprovalToUser' },
        { model: tenantDatabase.User, as: 'createdByUser' },
      ],
    },
    { model: tenantDatabase.Supplier, as: 'supplier' },
  ];
}

module.exports = CreateFormReject;