const { ItemUnit } = require('@src/models').tenant;

async function create({ item, createdBy }) {
  const itemUnit = await ItemUnit.create({
    label: 'pcs',
    name: 'Pieces',
    converter: 1,
    itemId: item.id,
    createdBy,
  });

  return itemUnit;
}

module.exports = { create };
