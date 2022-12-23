const { PurchaseDownPayment } = require('@src/models').tenant;

async function create({ supplier }) {
  const purchaseDownPayment = await PurchaseDownPayment.create({
    supplierId: supplier.id,
    supplierName: supplier.name,
    supplierAddress: supplier.address,
    supplierPhone: supplier.phone,
    amount: 30000,
    remaining: 0,
  });

  return purchaseDownPayment;
}

module.exports = { create };
