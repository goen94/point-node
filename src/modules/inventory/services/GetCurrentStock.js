const { Op } = require('sequelize');

class GetCurrentStock {
  constructor(tenantDatabase, { item, date, warehouseId, useDna = true, options }) {
    this.tenantDatabase = tenantDatabase;
    this.item = item;
    this.date = date;
    this.warehouseId = warehouseId;
    this.useDna = useDna;
    this.options = {
      ...(options.expiryDate ? { expiryDate: options.expiryDate } : {}),
      ...(options.productionNumber ? { productionNumber: options.productionNumber } : {}),
    };
  }

  async call() {
    const { sequelize } = this.tenantDatabase;
    const group = generateGroup(this.useDna, this.options);
    const where = generateFilter(this.tenantDatabase, {
      item: this.item,
      warehouseId: this.warehouseId,
      date: this.date,
      useDna: this.useDna,
      options: this.options,
    });
    const include = generateInclude(this.tenantDatabase);
    const attributes = generateAttributes(this.useDna, this.options, sequelize);
    const inventories = await this.tenantDatabase.Inventory.findAll({
      group,
      where,
      include,
      attributes,
    });

    if (!inventories[0]) {
      return 0;
    }

    return parseFloat(inventories[0].dataValues.remaining);
  }
}

function generateGroup(/* _useDna, _options */) {
  // return [
  //   'itemId',
  //   ...(useDna && !!options.productionNumber ? ['productionNumber'] : []),
  //   ...(useDna && !!options.expiryDate ? ['expiryDate'] : []),
  // ];
  return ['item_id', 'production_number', 'expiry_date'];
}

function generateAttributes(useDna, options, sequelize) {
  return [
    'itemId',
    ...(useDna && options.productionNumber ? ['productionNumber'] : []),
    ...(useDna && options.expiryDate ? ['expiryDate'] : []),
    [sequelize.fn('SUM', sequelize.col('quantity')), 'remaining'],
  ];
}

function generateInclude(tenantDatabase) {
  return [{ model: tenantDatabase.Form, as: 'form', attributes: [] }];
}

function generateFilter(tenantDatabase, { item, warehouseId, date, useDna, options }) {
  const { sequelize } = tenantDatabase;
  const filter = {
    itemId: item.id,
    warehouseId,
    [Op.and]: [sequelize.where(sequelize.fn('date', sequelize.col('form.date')), '<', date)],
  };
  if (useDna && item.requireExpiryDate && options.expiryDate) {
    filter.expiryDate = options.expiryDate;
  }
  if (useDna && item.requireProductionNumber && options.productionNumber) {
    filter.productionNumber = options.productionNumber;
  }

  return filter;
}

module.exports = GetCurrentStock;
