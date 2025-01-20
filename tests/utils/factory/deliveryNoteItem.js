const { DeliveryNoteItem } = require('@src/models').tenant;

async function create({ deliveryNote, item, allocation }) {
  const deliveryNoteItem = await DeliveryNoteItem.create({
    deliveryNoteId: deliveryNote.id,
    itemId: item.id,
    itemName: item.name,
    quantity: 10,
    price: 10000,
    unit: 'pcs',
    converter: 1,
    allocationId: allocation.id,
  });

  return deliveryNoteItem;
}

module.exports = { create };
