const { UserWarehouse } = require('@src/models').tenant;

async function create({ user, warehouse, isDefault = false }) {
  const userWarehouse = await UserWarehouse.create({
    userId: user.id,
    warehouseId: warehouse.id,
    isDefault,
  });

  return userWarehouse;
}

module.exports = { create };
