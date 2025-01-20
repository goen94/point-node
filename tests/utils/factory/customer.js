const faker = require('faker');
const { Customer } = require('@src/models').tenant;

async function create({ branch }) {
  const customer = await Customer.create({
    branchId: branch.id,
    name: faker.name.findName(),
    address: faker.address.streetAddress(),
    phone: faker.phone.phoneNumber(),
    email: faker.internet.email(),
  });

  return customer;
}

module.exports = { create };
