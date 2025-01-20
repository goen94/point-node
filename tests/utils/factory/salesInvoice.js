const { SalesInvoice } = require('@src/models').tenant;

async function create({ customer, referenceable, referenceableType }) {
  const salesInvoice = await SalesInvoice.create({
    dueDate: new Date('2021/01/01'),
    discountPercent: 0,
    discountValue: 0,
    tax: 0,
    typeOfTax: 'non',
    amount: 10000,
    remaining: 10000,
    customerId: customer.id,
    customerName: customer.name,
    customerAddress: customer.address,
    customerPhone: customer.phone,
    referenceableId: referenceable.id,
    referenceableType,
  });

  return salesInvoice;
}

module.exports = { create };
