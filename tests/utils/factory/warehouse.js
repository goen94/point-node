const faker = require('faker');
const { Warehouse } = require('@src/models').tenant;

async function create({ branch }) {
  const warehouse = await Warehouse.create({
    branchId: branch.id,
    name: faker.company.companyName(),
  });

  return warehouse;
}

module.exports = { create };
