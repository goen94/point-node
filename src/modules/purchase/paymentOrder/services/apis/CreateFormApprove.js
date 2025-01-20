const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');

class CreateFormApprove {
  constructor(tenantDatabase, { approver, paymentOrderId }) {
    this.tenantDatabase = tenantDatabase;
    this.approver = approver;
    this.paymentOrderId = paymentOrderId;
  }

  async call() {
    const paymentOrder = await this.tenantDatabase.PurchasePaymentOrder.findOne({
      where: { id: this.paymentOrderId },
      include: generatePaymentOrderIncludes(this.tenantDatabase),
    });
    if (!paymentOrder) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Form not exist');
    }

    const form = await paymentOrder.getForm();
    validate(form, this.approver);

    await this.tenantDatabase.sequelize.transaction(async (transaction) => {
      await form.update(
        {
          approvalStatus: 1,
          approvalBy: this.approver.id,
          approvalAt: new Date(),
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
          activity: 'Approved',
        },
        { transaction }
      );
    });

    await paymentOrder.reload();
    return { paymentOrder };
  }
}

function validate(form, approver) {
  if (form.approvalStatus === -1) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Form status is rejected');
  }
  if (form.approvalStatus === 1) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Form already approved');
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

module.exports = CreateFormApprove;