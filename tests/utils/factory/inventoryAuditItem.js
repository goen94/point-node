const { InventoryAuditItem } = require('@src/models').tenant;

async function create({
  inventoryAudit,
  item,
  quantity = 100,
  expiryDate,
  productionNumber,
  price = 100000,
  unit = 'PCS',
  converter = 1,
  notes,
}) {
  const inventoryAuditItem = await InventoryAuditItem.create({
    inventoryAuditId: inventoryAudit.id,
    itemId: item.id,
    quantity,
    expiryDate,
    productionNumber,
    price,
    unit,
    converter,
    notes,
  });

  return inventoryAuditItem;
}

module.exports = { create };
