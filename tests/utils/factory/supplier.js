const faker = require('faker');
const { Supplier } = require('@src/models').tenant;

async function create({ branch }) {
  const supplier = await Supplier.create({
    branchId: branch.id,
    name: faker.name.findName(),
    address: faker.address.streetAddress(),
    phone: faker.phone.phoneNumber(),
  });

  return supplier;
}

module.exports = { create };
