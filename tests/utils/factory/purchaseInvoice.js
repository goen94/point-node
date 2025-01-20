const { PurchaseInvoice } = require('@src/models').tenant;

async function create({ supplier }) {
  const purchaseInvoice = await PurchaseInvoice.create({
    supplierId: supplier.id,
    supplierName: supplier.name,
    supplierAddress: supplier.address,
    supplierPhone: supplier.phone,
    dueDate: new Date(),
    typeOfTax: 'exclude',
    tax: 20000,
    amount: 220000,
    remaining: 220000,
  });

  return purchaseInvoice;
}

module.exports = { create };
