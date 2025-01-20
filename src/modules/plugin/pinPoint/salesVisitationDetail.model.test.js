const { SalesVisitationDetail } = require('@src/models').tenant;

describe('Sales Visitation Detail Model', () => {
  it('returns correct morphTyppe', () => {
    expect(SalesVisitationDetail.getMorphType()).toEqual('SalesVisitationDetail');
  });

  describe('custom getters', () => {
    let salesVisitationDetail;
    beforeEach(() => {
      salesVisitationDetail = SalesVisitationDetail.build({
        quantity: 100,
        converter: 1,
        price: 100000,
        expiryDate: new Date('2022-03-01'),
      });
    });

    it('returns correct quantity value', () => {
      expect(salesVisitationDetail.quantity).toEqual(100);
    });

    it('returns correct converter value', () => {
      expect(salesVisitationDetail.converter).toEqual(1);
    });

    it('returns correct price value', () => {
      expect(salesVisitationDetail.price).toEqual(100000);
    });

    it('returns correct expiry date value', () => {
      expect(salesVisitationDetail.expiryDate).toEqual('2022-03-01 07:00:00');
    });

    it('returns correct expiry date value when value is nul', () => {
      salesVisitationDetail.expiryDate = null;
      expect(salesVisitationDetail.expiryDate).toEqual(null);
    });
  });
});
