const faker = require('faker');
const { SalesVisitation } = require('@src/models').tenant;

async function create({
  form,
  customer,
  branch,
  warehouse,
  group,
  address = 'example-address',
  phone = faker.phone.phoneNumber(),
  paymentMethod = 'example-payment-method',
}) {
  const salesVisitation = await SalesVisitation.create({
    formId: form.id,
    customerId: customer.id,
    branchId: branch.id,
    warehouseId: warehouse.id,
    name: faker.commerce.productName(),
    group,
    address,
    phone,
    paymentMethod,
  });

  return salesVisitation;
}

module.exports = { create };
