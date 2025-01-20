const { SalesVisitation } = require('@src/models').tenant;

describe('Sales Visitation Model', () => {
  it('returns correct morphTyppe', () => {
    expect(SalesVisitation.getMorphType()).toEqual('SalesVisitation');
  });
});
