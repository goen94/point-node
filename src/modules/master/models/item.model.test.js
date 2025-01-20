const factory = require('@root/tests/utils/factory');

describe('Item Model', () => {
  describe('#calculateCogs', () => {
    it('returns 0 when inventory and journal give NaN value', async () => {
      const item = await factory.item.create();
      const cogs = await item.calculateCogs();
      expect(cogs).toEqual(0);
    });

    it('returns 0 when inventory less than 0', async () => {
      const item = await factory.item.create();
      const maker = await factory.user.create();
      const approver = await factory.user.create();
      const branch = await factory.branch.create();
      const warehouse = await factory.warehouse.create({ branch });
      const inventoryForm = await factory.form.create({
        branch,
        formable: { id: 0 },
        formableType: 'PurchaseInvoice',
        number: 'PI2109001',
        createdBy: maker.id,
        updatedBy: maker.id,
        requestApprovalTo: approver.id,
      });
      await factory.inventory.create({ form: inventoryForm, warehouse, item, quantity: -10 });
      const cogs = await item.calculateCogs();
      expect(cogs).toEqual(0);
    });
  });
});
