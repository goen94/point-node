const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const GetCurrentStock = require('@src/modules/inventory/services/GetCurrentStock');
const ProcessSendUpdateApprovalWorker = require('../../workers/ProcessSendUpdateApproval.worker');

class UpdateForm {
  constructor(tenantDatabase, { maker, stockCorrectionId, updateFormDto }) {
    this.tenantDatabase = tenantDatabase;
    this.maker = maker;
    this.stockCorrectionId = stockCorrectionId;
    this.updateFormDto = updateFormDto;
  }

  async call() {
    const stockCorrection = await this.tenantDatabase.StockCorrection.findOne({
      where: { id: this.stockCorrectionId },
      include: [
        { model: this.tenantDatabase.Form, as: 'form' },
        { model: this.tenantDatabase.StockCorrectionItem, as: 'items' },
        { model: this.tenantDatabase.Warehouse, as: 'warehouse' },
      ],
    });
    const { form: stockCorrectionForm, warehouse } = stockCorrection;
    validate(stockCorrectionForm, this.maker);

    await this.tenantDatabase.sequelize.transaction(async (transaction) => {
      await deleteJournal(this.tenantDatabase, { stockCorrectionForm, transaction });
      await deleteInventory(this.tenantDatabase, { stockCorrectionForm, transaction });
      await updateStockCorrectionForm({
        maker: this.maker,
        updateFormDto: this.updateFormDto,
        stockCorrectionForm,
        transaction,
      });
      await deleteOldStockCorrectionItems({ stockCorrection, transaction });
      await addNewStockCorrectionItems(this.tenantDatabase, {
        stockCorrection,
        stockCorrectionForm,
        warehouse,
        updateFormDto: this.updateFormDto,
        transaction,
      });
    });

    await sendEmailToApprover(this.tenantDatabase, stockCorrection);

    await stockCorrection.reload();
    return { stockCorrection };
  }
}

function validate(stockCorrectionForm, maker) {
  if (stockCorrectionForm.createdBy !== maker.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden - Only maker can update the stock correction');
  }
}

async function deleteOldStockCorrectionItems({ stockCorrection, transaction }) {
  const doDelete = stockCorrection.items.map((stockCorrectionItem) => {
    return stockCorrectionItem.destroy({ transaction });
  });

  await Promise.all(doDelete);
}

async function addNewStockCorrectionItems(
  tenantDatabase,
  { stockCorrection, stockCorrectionForm, warehouse, updateFormDto, transaction }
) {
  const { items: itemsRequest } = updateFormDto;
  const doAddStockCorrectionItem = itemsRequest.map(async (itemRequest) => {
    if (itemRequest.converter !== 1) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Only can use smallest item unit');
    }
    const item = await tenantDatabase.Item.findOne({ where: { id: itemRequest.itemId } });

    const itemStock = await new GetCurrentStock(tenantDatabase, {
      item,
      date: stockCorrectionForm.date,
      warehouseId: warehouse.id,
      options: {
        expiryDate: itemRequest.expiryDate,
        productionNumber: itemRequest.productionNumber,
      },
    }).call();
    if (itemStock + itemRequest.stockCorrection < 0) {
      throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Stock can not be minus');
    }
    return tenantDatabase.StockCorrectionItem.create(
      {
        stockCorrectionId: stockCorrection.id,
        itemId: item.id,
        quantity: itemRequest.stockCorrection,
        unit: itemRequest.unit,
        converter: itemRequest.converter,
        notes: itemRequest.notes,
        allocationId: itemRequest.allocationId,
        ...(itemRequest.expiryDate && { expiryDate: itemRequest.expiryDate }),
        ...(itemRequest.productionNumber && { productionNumber: itemRequest.productionNumber }),
      },
      { transaction }
    );
  });

  await Promise.all(doAddStockCorrectionItem);
}

async function updateStockCorrectionForm({ maker, updateFormDto, stockCorrectionForm, transaction }) {
  const formData = await buildFormData({ maker, updateFormDto });
  const updatedForm = await stockCorrectionForm.update(formData, { transaction });

  return updatedForm;
}

async function buildFormData({ maker, updateFormDto }) {
  const { notes, requestApprovalTo } = updateFormDto;

  return {
    date: new Date(),
    notes,
    updatedBy: maker.id,
    requestApprovalTo,
    done: false,
    approvalStatus: 0,
    approvalReason: null,
    cancellationStatus: null,
    requestCancellationTo: null,
  };
}

async function deleteJournal(tenantDatabase, { stockCorrectionForm, transaction }) {
  await tenantDatabase.Journal.destroy(
    {
      where: { formId: stockCorrectionForm.id },
    },
    { transaction }
  );
}

function deleteInventory(tenantDatabase, { stockCorrectionForm, transaction }) {
  return tenantDatabase.Inventory.destroy(
    {
      where: { formId: stockCorrectionForm.id },
    },
    { transaction }
  );
}

async function sendEmailToApprover(tenantDatabase, stockCorrection) {
  const tenantName = tenantDatabase.sequelize.config.database.replace('point_', '');
  await new ProcessSendUpdateApprovalWorker({
    tenantName,
    stockCorrectionId: stockCorrection.id,
  }).call();
}

module.exports = UpdateForm;
