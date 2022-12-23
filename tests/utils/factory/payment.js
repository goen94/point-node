const { Payment } = require('@src/models').tenant;

async function create({ supplier, paymentType, chartOfAccount } = {}) {
  const payment = await Payment.create({
    paymentType: paymentType,
    disbursed: 1,
    paymentAccountId: chartOfAccount.id,
    amount: 65000,
    paymentableId: supplier.id,
    paymentableType: 'Supplier',
    paymentableName: supplier.name,
  });

  return payment;
}

module.exports = { create };
