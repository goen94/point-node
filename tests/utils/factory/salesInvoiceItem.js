const { SalesInvoiceItem } = require('@src/models').tenant;

async function create({ salesInvoice, referenceable, referenceableItem, item, allocation }) {
  const salesInvoiceItem = await SalesInvoiceItem.create({
    salesInvoiceId: salesInvoice.id,
    referenceableId: referenceable.id,
    referenceableType: referenceable.constructor.getMorphType(),
    itemReferenceableId: referenceableItem.id,
    itemReferenceableType: referenceableItem.constructor.getMorphType(),
    itemId: item.id,
    itemName: item.name,
    quantity: 10,
    price: 10000,
    unit: 'pcs',
    converter: 1,
    allocationId: allocation.id,
  });

  return salesInvoiceItem;
}

module.exports = { create };
