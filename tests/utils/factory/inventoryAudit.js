const { InventoryAudit } = require('@src/models').tenant;

async function create({ warehouse }) {
  const inventoryAudit = await InventoryAudit.create({
    warehouseId: warehouse.id,
  });

  return inventoryAudit;
}

module.exports = { create };
