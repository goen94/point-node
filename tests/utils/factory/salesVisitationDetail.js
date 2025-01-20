const { SalesVisitationDetail } = require('@src/models').tenant;

async function create({ salesVisitation, item, allocation }) {
  const salesVisitationDetail = await SalesVisitationDetail.create({
    salesVisitationId: salesVisitation.id,
    itemId: item.id,
    quantity: 10,
    price: 10000,
    unit: 'pcs',
    converter: 1,
    allocationId: allocation.id,
  });

  return salesVisitationDetail;
}

module.exports = { create };
