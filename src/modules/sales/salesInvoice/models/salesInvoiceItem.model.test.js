const { SalesInvoiceItem } = require('@src/models').tenant;

describe('Sales Invoice Item Model', () => {
  describe('#getTotalPrice', () => {
    it('returns correct total price', () => {
      const salesInvoiceItem = SalesInvoiceItem.build({
        quantity: 3,
        price: 1000,
        discountValue: 100,
      });
      const totalPrice = salesInvoiceItem.getTotalPrice();
      expect(totalPrice).toEqual(2700);
    });
  });

  describe('custom getters', () => {
    let salesInvoiceItem;
    beforeEach(() => {
      salesInvoiceItem = SalesInvoiceItem.build({
        quantity: 100,
        price: 1000,
        discountPercent: 5,
        discountValue: 100,
        converter: 1,
        expiryDate: new Date('2022-03-01'),
      });
    });

    it('returns correct quantity value', () => {
      expect(salesInvoiceItem.quantity).toEqual(100);
    });

    it('returns correct price value', () => {
      expect(salesInvoiceItem.price).toEqual(1000);
    });

    it('returns correct discountPercent value', () => {
      expect(salesInvoiceItem.discountPercent).toEqual(5);
    });

    it('returns correct discountValue value', () => {
      expect(salesInvoiceItem.discountValue).toEqual(100);
    });

    it('returns correct converter value', () => {
      expect(salesInvoiceItem.converter).toEqual(1);
    });

    it('returns correct expiryDate value', () => {
      expect(salesInvoiceItem.expiryDate).toEqual('2022-03-01 07:00:00');
    });

    it('returns correct expiryDate null value', () => {
      salesInvoiceItem.expiryDate = null;
      expect(salesInvoiceItem.expiryDate).toEqual(null);
    });
  });
});
