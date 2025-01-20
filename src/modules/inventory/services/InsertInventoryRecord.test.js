const factory = require('@root/tests/utils/factory');
const tenantDatabase = require('@src/models').tenant;
const InsertInventoryRecord = require('./InsertInventoryRecord');

describe('Inventory - InsertInvetoryRecord', () => {
  describe('when item require production number and expiry date', () => {
    let maker, branch, warehouse, item, inventoryForm;
    beforeEach(async (done) => {
      maker = await factory.user.create();
      branch = await factory.branch.create();
      warehouse = await factory.warehouse.create({ branch });
      item = await factory.item.create({ requireProductionNumber: true, requireExpiryDate: true });
      inventoryForm = await factory.form.create({
        date: new Date('2022-02-01'),
        branch,
        number: 'PI2101001',
        formable: { id: 1 },
        formableType: 'PurchaseInvoice',
        createdBy: maker.id,
        updatedBy: maker.id,
      });

      done();
    });

    it('add correct new inventory record', async () => {
      const { inventory: newInventory } = await new InsertInventoryRecord(tenantDatabase, {
        form: inventoryForm,
        warehouse,
        item,
        quantity: 100,
        unit: 'PCS',
        converter: 1,
        options: {
          expiryDate: new Date('2022-03-01'),
          productionNumber: '001',
        },
      }).call();

      expect(newInventory.quantity).toEqual(100);
      expect(newInventory.quantityReference).toEqual(100);
    });

    it('throw error when require production number but it doesnt provide in options', async () => {
      await expect(async () => {
        await new InsertInventoryRecord(tenantDatabase, {
          form: inventoryForm,
          warehouse,
          item,
          quantity: 100,
          unit: 'PCS',
          converter: 1,
          options: {
            expiryDate: new Date('2022-03-01'),
          },
        }).call();
      }).rejects.toThrow('Production number of item is required');
    });

    it('throw error when require expiry date but it doesnt provide in options', async () => {
      await expect(async () => {
        await new InsertInventoryRecord(tenantDatabase, {
          form: inventoryForm,
          warehouse,
          item,
          quantity: 100,
          unit: 'PCS',
          converter: 1,
          options: {
            productionNumber: '001',
          },
        }).call();
      }).rejects.toThrow('Expiry date of item is required');
    });

    it('throw error when quantity is 0', async () => {
      await expect(async () => {
        await new InsertInventoryRecord(tenantDatabase, {
          form: inventoryForm,
          warehouse,
          item,
          quantity: 0,
          unit: 'PCS',
          converter: 1,
          options: {
            expiryDate: new Date('2022-03-01'),
            productionNumber: '001',
          },
        }).call();
      }).rejects.toThrow('Invalid quantity');
    });

    it('throw error when final quantity get minus', async () => {
      await expect(async () => {
        await new InsertInventoryRecord(tenantDatabase, {
          form: inventoryForm,
          warehouse,
          item,
          quantity: -1000,
          unit: 'PCS',
          converter: 1,
          options: {
            expiryDate: new Date('2022-03-01'),
            productionNumber: '001',
          },
        }).call();
      }).rejects.toThrow(`Insufficient ${item.name} stock`);
    });

    it('throw error when audit is exist', async () => {
      const inventoryAudit = await factory.inventoryAudit.create({
        warehouse,
      });
      await factory.inventoryAuditItem.create({
        inventoryAudit,
        item,
        expiryDate: new Date('2022-03-01'),
        productionNumber: '001',
      });
      const inventoryAuditForm = await factory.form.create({
        date: new Date('2022-01-01'),
        branch,
        number: 'PI2101002',
        formable: { id: inventoryAudit.id },
        formableType: 'InventoryAudit',
        createdBy: maker.id,
        updatedBy: maker.id,
      });

      await expect(async () => {
        await new InsertInventoryRecord(tenantDatabase, {
          form: inventoryForm,
          warehouse,
          item,
          quantity: 100,
          unit: 'PCS',
          converter: 1,
          options: {
            expiryDate: new Date('2022-03-01'),
            productionNumber: '001',
          },
        }).call();
      }).rejects.toThrow(`${item.name} already audited in ${inventoryAuditForm.number}`);
    });
  });
});
