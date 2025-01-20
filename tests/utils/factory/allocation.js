const faker = require('faker');
const { Allocation } = require('@src/models').tenant;

async function create({ branch }) {
  const allocation = await Allocation.create({
    code: faker.datatype.string(10),
    name: faker.company.companyName(),
    branchId: branch.id,
  });

  return allocation;
}

module.exports = { create };
