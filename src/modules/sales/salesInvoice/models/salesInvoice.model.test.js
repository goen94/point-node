const { SalesInvoice } = require('@src/models').tenant;

describe('Sales Invoice Model', () => {
  describe('#getReferenceable', () => {
    it('returns null if referenceableType is not defined yet on model', async () => {
      const salesInvoice = SalesInvoice.build({ referenceableType: 'not-defined-yet' });
      const referenceable = await salesInvoice.getReferenceable();
      expect(referenceable).toBeNull();
    });
  });

  describe('#setReferenceable', () => {
    it('does not set referenceable if referenceableType is not defined yet on model', async () => {
      const salesInvoice = SalesInvoice.build();
      await salesInvoice.setReferenceable('not-defined-yet');
      expect(salesInvoice.referenceable).toBeUndefined();
    });
  });
});
