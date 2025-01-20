const { DeliveryNoteItem } = require('@src/models').tenant;

describe('Sales Visitation Detail Model', () => {
  it('returns correct morphTyppe', () => {
    expect(DeliveryNoteItem.getMorphType()).toEqual('SalesDeliveryNoteItem');
  });

  describe('custom getters', () => {
    let salesVisitationDetail;
    beforeEach(() => {
      salesVisitationDetail = DeliveryNoteItem.build({
        grossWeight: 100,
        tareWeight: 10,
        netWeight: 90,
        quantity: 100,
        expiryDate: new Date('2022-03-01'),
        price: 100000,
        discountPercent: 0.01,
        discountValue: 100,
        converter: 1,
      });
    });

    it('returns correct grossWeight value', () => {
      expect(salesVisitationDetail.grossWeight).toEqual(100);
    });

    it('returns correct tareWeight value', () => {
      expect(salesVisitationDetail.tareWeight).toEqual(10);
    });

    it('returns correct netWeight value', () => {
      expect(salesVisitationDetail.netWeight).toEqual(90);
    });

    it('returns correct quantity value', () => {
      expect(salesVisitationDetail.quantity).toEqual(100);
    });

    it('returns correct expiry date value', () => {
      expect(salesVisitationDetail.expiryDate).toEqual('2022-03-01 07:00:00');
    });

    it('returns correct expiry date value when value is nul', () => {
      salesVisitationDetail.expiryDate = null;
      expect(salesVisitationDetail.expiryDate).toEqual(null);
    });

    it('returns correct price value', () => {
      expect(salesVisitationDetail.price).toEqual(100000);
    });

    it('returns correct discountPercent value', () => {
      expect(salesVisitationDetail.discountPercent).toEqual(0.01);
    });

    it('returns correct discountValue value', () => {
      expect(salesVisitationDetail.discountValue).toEqual(100);
    });

    it('returns correct converter value', () => {
      expect(salesVisitationDetail.converter).toEqual(1);
    });
  });
});
