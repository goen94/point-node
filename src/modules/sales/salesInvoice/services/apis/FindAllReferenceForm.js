const { Op } = require('sequelize');

class FindAllReferenceForm {
  constructor(tenantDatabase, queries) {
    this.tenantDatabase = tenantDatabase;
    this.queries = queries;
  }

  async call() {
    const [queryLimit, queryPage] = [parseInt(this.queries.limit, 10) || 10, parseInt(this.queries.page, 10) || 1];
    const { count: total, rows: formReferences } = await this.tenantDatabase.Form.findAndCountAll({
      subQuery: false,
      where: generateFilters(this.queries),
      include: generateIncludes(this.tenantDatabase),
      order: [['createdAt', 'ASC']],
      limit: queryLimit,
      offset: offsetParams(queryPage, queryLimit),
    });

    removeUnusedAttributes(formReferences);

    const totalPage = Math.ceil(total / parseInt(queryLimit, 10));

    return { total, formReferences, maxItem: queryLimit, currentPage: queryPage, totalPage };
  }
}

function generateFilters(queries) {
  const filter = { [Op.and]: [] };

  // form done status
  const filterDoneForm = { done: false };
  filter[Op.and] = [...filter[Op.and], filterDoneForm];

  // form type
  const filterFormType = generateFilterFormType();
  filter[Op.and] = [...filter[Op.and], filterFormType];

  // like
  const filterLike = generateFilterLike(queries.filter_like);
  if (filterLike.length > 0) {
    filter[Op.and] = [...filter[Op.and], { [Op.or]: filterLike }];
  }

  return filter;
}

function generateFilterFormType() {
  return {
    [Op.or]: [
      { number: { [Op.startsWith]: 'DN' } },
      {
        [Op.and]: [
          { number: { [Op.startsWith]: 'SV' } },
          { '$salesVisitation.payment_method$': { [Op.or]: ['credit', 'cash'] } },
        ],
      },
    ],
  };
}

function generateFilterLike(likeQueries) {
  const filtersObject = likeQueries ? JSON.parse(likeQueries) : {};
  const filterKeys = Object.keys(filtersObject);

  const result = filterKeys.map((key) => {
    const likeKey = key.split('.').length > 1 ? `$${key}$` : key;
    return {
      [likeKey]: { [Op.substring]: filtersObject[key] || '' },
    };
  });

  return result;
}

function generateIncludes(tenantDatabase) {
  return [
    {
      model: tenantDatabase.DeliveryNote,
      as: 'salesDeliveryNote',
      include: [
        {
          model: tenantDatabase.DeliveryNoteItem,
          as: 'items',
          include: [
            { model: tenantDatabase.Allocation, as: 'allocation' },
            {
              model: tenantDatabase.DeliveryOrderItem,
              as: 'deliveryOrderItem',
              include: [{ model: tenantDatabase.SalesOrderItem, as: 'salesOrderItem' }],
            },
            { model: tenantDatabase.Item, as: 'item' },
          ],
          separate: true,
        },
        { model: tenantDatabase.Customer, as: 'customer' },
        {
          model: tenantDatabase.DeliveryOrder,
          as: 'deliveryOrder',
          include: [
            {
              model: tenantDatabase.SalesOrder,
              as: 'salesOrder',
              include: [{ model: tenantDatabase.Form, as: 'form' }],
            },
          ],
        },
      ],
    },
    {
      model: tenantDatabase.SalesVisitation,
      as: 'salesVisitation',
      include: [
        {
          model: tenantDatabase.SalesVisitationDetail,
          as: 'items',
          include: [{ model: tenantDatabase.Item, as: 'item' }],
          separate: true,
        },
        { model: tenantDatabase.Customer, as: 'customer' },
      ],
    },
  ];
}

function removeUnusedAttributes(formReferences) {
  formReferences.forEach((formReference) => {
    if (formReference.salesDeliveryNote?.dataValues?.itemsQuery) {
      formReference.salesDeliveryNote.dataValues.itemsQuery = undefined;
    }
  });
}

function offsetParams(page = 1, maxItem = 10) {
  return page > 1 ? maxItem * (page - 1) : 0;
}

module.exports = FindAllReferenceForm;
