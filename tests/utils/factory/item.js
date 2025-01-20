const faker = require('faker');
const { Item } = require('@src/models').tenant;

async function create({ chartOfAccount, requireExpiryDate = false, requireProductionNumber = false } = {}) {
  const item = await Item.create({
    code: faker.datatype.string(),
    name: faker.commerce.productName(),
    stock: 100,
    chartOfAccountId: chartOfAccount?.id,
    requireExpiryDate,
    requireProductionNumber,
  });

  return item;
}

module.exports = { create };
