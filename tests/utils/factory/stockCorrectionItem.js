const { StockCorrectionItem } = require('@src/models').tenant;

async function create({ stockCorrection, quantity = 10, item }) {
  const stockCorrectionItem = await StockCorrectionItem.create({
    stockCorrectionId: stockCorrection.id,
    itemId: item.id,
    itemName: item.name,
    quantity,
    unit: 'pcs',
    converter: 1,
  });

  return stockCorrectionItem;
}

module.exports = { create };
