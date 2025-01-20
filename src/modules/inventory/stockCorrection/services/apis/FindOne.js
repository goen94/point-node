const GetCurrentStock = require('../../../services/GetCurrentStock');

class FindOne {
  constructor(tenantDatabase, stockCorrectionId) {
    this.tenantDatabase = tenantDatabase;
    this.stockCorrectionId = stockCorrectionId;
  }

  async call() {
    const stockCorrection = await this.tenantDatabase.StockCorrection.findOne({
      where: {
        id: this.stockCorrectionId,
      },
      include: [
        {
          model: this.tenantDatabase.Form,
          as: 'form',
          include: [
            { model: this.tenantDatabase.User, as: 'createdByUser' },
            { model: this.tenantDatabase.User, as: 'requestApprovalToUser' },
          ],
        },
        { model: this.tenantDatabase.Warehouse, as: 'warehouse' },
        {
          model: this.tenantDatabase.StockCorrectionItem,
          as: 'items',
          include: [
            { model: this.tenantDatabase.Item, as: 'item', include: [{ model: this.tenantDatabase.ItemUnit, as: 'units' }] },
            { model: this.tenantDatabase.Allocation, as: 'allocation' },
          ],
        },
      ],
    });

    if (stockCorrection.form.approvalStatus === 0) {
      await getStockCorrectionItemStock(this.tenantDatabase, stockCorrection);
    }

    return { stockCorrection };
  }
}

async function getStockCorrectionItemStock(tenantDatabase, stockCorrection) {
  const { form: stockCorrectionForm, items: stockCorrectionItems } = stockCorrection;
  const doGetItemStocks = stockCorrectionItems.map(async (stockCorrectionItem) => {
    const currentStock = await new GetCurrentStock(tenantDatabase, {
      item: stockCorrectionItem.item,
      date: stockCorrectionForm.date,
      warehouseId: stockCorrection.warehouseId,
      options: {
        expiryDate: stockCorrectionItem.expiryDate,
        productionNumber: stockCorrectionItem.productionNumber,
      },
    }).call();

    stockCorrectionItem.initialStock = currentStock;
    stockCorrectionItem.finalStock = currentStock + stockCorrectionItem.quantity;
  });

  await Promise.all(doGetItemStocks);

  return stockCorrectionItems;
}

module.exports = FindOne;
