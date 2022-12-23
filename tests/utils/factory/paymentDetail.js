const faker = require('faker');
const { PaymentDetail } = require('@src/models').tenant;

async function create({ payment, paymentOrder, chartOfAccount } = {}) {
  const paymentDetail = await PaymentDetail.create({
    paymentId: payment.id,
    chartOfAccountId: chartOfAccount.id,
    amount: 65000,
    referenceableId: paymentOrder.id,
    referenceableType: 'PurchasePaymentOrder',
  });

  return paymentDetail;
}

module.exports = { create };
