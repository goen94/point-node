const { Op } = require('sequelize');
const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const GetCurrentStock = require('./GetCurrentStock');

class InsertInventoryRecord {
  constructor(tenantDatabase, { form, warehouse, item, quantity, unit, converter, options, transaction }) {
    this.tenantDatabase = tenantDatabase;
    this.form = form;
    this.warehouse = warehouse;
    this.item = item;
    this.quantity = quantity;
    this.unit = unit;
    this.converter = converter;
    this.options = options;
    this.transaction = transaction;
  }

  async call() {
    await validate(this.tenantDatabase, {
      quantity: this.quantity,
      item: this.item,
      options: this.options,
      warehouse: this.warehouse,
      form: this.form,
    });
    const inventory = await this.tenantDatabase.Inventory.create(
      {
        formId: this.form.id,
        warehouseId: this.warehouse.id,
        itemId: this.item.id,
        quantity: this.quantity * this.converter,
        quantityReference: this.quantity,
        unitReference: this.unit,
        converterReference: this.converter,
        ...(this.options.expiryDate && { expiryDate: this.options.expiryDate }),
        ...(this.options.productionNumber && { productionNumber: this.options.productionNumber }),
      },
      { transaction: this.transaction }
    );

    return { inventory };
  }
}

async function validate(tenantDatabase, { quantity, item, options, warehouse, form }) {
  if (quantity === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid quantity');
  }
  if (item.requireExpiryDate && !options.expiryDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Expiry date of item is required');
  }
  if (item.requireProductionNumber && !options.productionNumber) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Production number of item is required');
  }
  if (quantity < 0) {
    const stock = await new GetCurrentStock(tenantDatabase, {
      item,
      date: form.date,
      warehouseId: warehouse.id,
      options,
    }).call();
    if (Math.abs(quantity) > stock) {
      throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, `Insufficient ${item.name} stock`);
    }
  }
  const existingAudit = await getExistingAudit(tenantDatabase, { item, date: form.date, warehouse });
  if (existingAudit) {
    throw new ApiError(
      httpStatus.UNPROCESSABLE_ENTITY,
      `${item.name} already audited in ${existingAudit.inventoryAudit.form.number}`
    );
  }
}

async function getExistingAudit(tenantDatabase, { item, date, warehouse }) {
  const existingAudit = await tenantDatabase.InventoryAuditItem.findOne({
    where: {
      '$inventoryAudit.form.date$': { [Op.lte]: date },
      '$inventoryAudit.form.cancellation_status$': { [Op.or]: [{ [Op.is]: null }, { [Op.ne]: 1 }] },
      '$inventoryAudit.warehouse_id$': warehouse.id,
      itemId: item.id,
    },
    include: [
      {
        model: tenantDatabase.InventoryAudit,
        as: 'inventoryAudit',
        include: [{ model: tenantDatabase.Form, as: 'form' }],
      },
    ],
  });

  return existingAudit;
}

module.exports = InsertInventoryRecord;
