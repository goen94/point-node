const factory = require('@root/tests/utils/factory');
const tenantDatabase = require('@src/models').tenant;
const GetCurrentStock = require('./GetCurrentStock');

describe('Inventory - Get Current Stock', () => {
  describe('when item require production number and expiry date', () => {
    let warehouse, item, inventory;
    beforeEach(async (done) => {
      const maker = await factory.user.create();
      const branch = await factory.branch.create();
      warehouse = await factory.warehouse.create({ branch });
      item = await factory.item.create({ requireProductionNumber: true, requireExpiryDate: true });
      const inventoryForm = await factory.form.create({
        date: new Date('2022-01-01'),
        branch,
        number: 'PI2101001',
        formable: { id: 1 },
        formableType: 'PurchaseInvoice',
        createdBy: maker.id,
        updatedBy: maker.id,
      });
      inventory = await factory.inventory.create({
        form: inventoryForm,
        warehouse,
        item,
        productionNumber: '001',
        expiryDate: new Date('2022-03-01'),
      });

      done();
    });

    it('returns correct stock', async () => {
      const currentStock = await new GetCurrentStock(tenantDatabase, {
        item,
        date: new Date('2022-03-01'),
        warehouseId: warehouse.id,
        useDna: true,
        options: {
          productionNumber: '001',
          expiryDate: new Date('2022-03-01'),
        },
      }).call();

      expect(currentStock).toEqual(100);
    });

    it('returns 0 when no inventories recorded', async () => {
      await inventory.destroy();
      const currentStock = await new GetCurrentStock(tenantDatabase, {
        item,
        date: new Date('2022-03-01'),
        warehouseId: warehouse.id,
        useDna: true,
        options: {
          productionNumber: '001',
          expiryDate: new Date('2022-03-01'),
        },
      }).call();

      expect(currentStock).toEqual(0);
    });
  });
});
