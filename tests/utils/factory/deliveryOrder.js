const { DeliveryOrder } = require('@src/models').tenant;

async function create({ customer, warehouse }) {
  const deliveryOrder = await DeliveryOrder.create({
    customerId: customer.id,
    customerName: customer.name,
    warehouseId: warehouse.id,
  });

  return deliveryOrder;
}

module.exports = { create };
