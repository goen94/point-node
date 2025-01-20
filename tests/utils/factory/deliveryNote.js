const faker = require('faker');
const { DeliveryNote } = require('@src/models').tenant;

async function create({ customer, warehouse, deliveryOrder }) {
  const deliveryNote = await DeliveryNote.create({
    customerId: customer.id,
    customerName: customer.name,
    warehouseId: warehouse.id,
    deliveryOrderId: deliveryOrder.id,
    driver: faker.name.findName(),
    licensePlate: 'B1234AA',
  });

  return deliveryNote;
}

module.exports = { create };
