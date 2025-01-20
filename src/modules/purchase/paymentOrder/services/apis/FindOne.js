const validatePermission = require('@src/utils/permission');
const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');

class FindOne {
  constructor(tenantDatabase, user, paymentOrderId) {
    this.tenantDatabase = tenantDatabase;
    this.user = user;
    this.paymentOrderId = paymentOrderId;
  }

  async call() {
    await validate(this.tenantDatabase, this.user);
    const paymentOrder = await this.tenantDatabase.PurchasePaymentOrder.findOne({
      where: {
        id: this.paymentOrderId,
      },
      include: [
        {
          model: this.tenantDatabase.PurchasePaymentOrderDetails,
          as: 'invoices',
          include: [
            {
              model: this.tenantDatabase.PurchaseInvoice,
              as: 'purchaseInvoice',
              include: [{ model: this.tenantDatabase.Form, as: 'form' }],
            }
          ],
        },
        {
          model: this.tenantDatabase.PurchasePaymentOrderDetails,
          as: 'downPayments',
          include: [
            {
              model: this.tenantDatabase.PurchaseDownPayment,
              as: 'purchaseDownPayment',
              include: [{ model: this.tenantDatabase.Form, as: 'form' }],
            }
          ],
        },
        {
          model: this.tenantDatabase.PurchasePaymentOrderDetails,
          as: 'returns',
          include: [
            {
              model: this.tenantDatabase.PurchaseReturn,
              as: 'purchaseReturn',
              include: [{ model: this.tenantDatabase.Form, as: 'form' }],
            }
          ],
        },
        {
          model: this.tenantDatabase.PurchasePaymentOrderDetails,
          as: 'others',
          include: [
            {
              model: this.tenantDatabase.ChartOfAccount,
              as: 'chartOfAccount',
            },
            {
              model: this.tenantDatabase.Allocation,
              as: 'allocation',
            }
          ],
        },
        {
          model: this.tenantDatabase.Form,
          as: 'form',
          include: [
            { model: this.tenantDatabase.User, as: 'requestApprovalToUser' },
            { model: this.tenantDatabase.User, as: 'createdByUser' },
          ],
        },
        { model: this.tenantDatabase.Supplier, as: 'supplier' },
      ],
    });

    return { paymentOrder };
  }
}

async function validate(tenantDatabase, user) {
  await validateBranch(tenantDatabase, user);
  await validatePermission(tenantDatabase, { userId: user.id, module: 'purchase payment order', action: 'read' });
}

async function validateBranch(tenantDatabase, maker) {
  const branchDefault = await tenantDatabase.BranchUser.findOne({
    where: { userId: maker.id, isDefault: 1 },
  });

  if (!branchDefault) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'please set default branch to read this form');
  }
}

module.exports = FindOne;
