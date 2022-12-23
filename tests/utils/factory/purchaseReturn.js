const { PurchaseReturn } = require('@src/models').tenant;

async function create({ supplier, purchaseInvoice, warehouse }) {
  const purchaseReturn = await PurchaseReturn.create({
    purchaseInvoiceId: purchaseInvoice.id,
    warehouseId: warehouse.id,
    supplierId: supplier.id,
    supplierName: supplier.name,
    supplierPhone: supplier.phone,
    tax: 1000,
    amount: 11000,
    remaining: 11000,
  });

  return purchaseReturn;
}

module.exports = { create };
