const faker = require('faker');
const { Branch } = require('@src/models').tenant;

async function create({ name } = {}) {
  const branch = await Branch.create({
    name: name || faker.company.companyName(),
  });

  return branch;
}

module.exports = { create };
