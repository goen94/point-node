const { Op } = require('sequelize');

class GetReport {
  constructor(tenantDatabase, queries) {
    this.tenantDatabase = tenantDatabase;
    this.queries = queries;
  }

  async call() {
    const queryValue = sanitizeQuery(this.queries);
    const filter = generateFilter(queryValue);

    const salesInvoices = await this.tenantDatabase.SalesInvoice.findAll({
      where: filter,
      include: [
        {
          model: this.tenantDatabase.SalesInvoiceItem,
          as: 'items',
          include: [{ model: this.tenantDatabase.Allocation, as: 'allocation' }],
        },
        { model: this.tenantDatabase.Form, as: 'form' },
        { model: this.tenantDatabase.Customer, as: 'customer' },
      ],
      order: [[{ model: this.tenantDatabase.Form, as: 'form' }, 'created_at', 'ASC']],
    });

    return { salesInvoices, minDate: queryValue.minDate, maxDate: queryValue.maxDate };
  }
}

function sanitizeQuery(queries) {
  let minDate = new Date();
  minDate.setMonth(new Date().getMonth() - 1);
  if (queries.filter_date_min) {
    minDate = new Date(queries.filter_date_min);
  }
  minDate.setUTCHours(0, 0, 0, 0);

  let maxDate = new Date();
  if (queries.filter_date_max) {
    maxDate = new Date(queries.filter_date_max);
  }
  maxDate.setUTCHours(23, 59, 59, 999);

  let selectedItem = [];
  if (queries?.selected_item?.split(',').length > 1) {
    selectedItem = queries.selected_item.split(',');
  }
  if (selectedItem.length === 1 && selectedItem[0] === '') {
    selectedItem = [];
  }

  let selectedCustomer = [];
  if (queries?.selected_customer?.split(',').length > 1) {
    selectedCustomer = queries.selected_customer.split(',');
  }
  if (selectedCustomer.length === 1 && selectedCustomer[0] === '') {
    selectedCustomer = [];
  }

  let selectedAllocation = [];
  if (queries?.selected_allocation?.split(',').length > 1) {
    selectedAllocation = queries.selected_allocation.split(',');
  }
  if (selectedAllocation.length === 1 && selectedAllocation[0] === '') {
    selectedAllocation = [];
  }

  return {
    minDate,
    maxDate,
    selectedItem,
    selectedCustomer,
    selectedAllocation,
  };
}

function generateFilter(queryValue) {
  const filter = { [Op.and]: [] };

  // not cancelled sales invoice
  const filterNotCancelledSalesInvoice = {
    '$form.cancellation_status$': {
      [Op.or]: [{ [Op.ne]: 1 }, { [Op.is]: null }],
    },
  };
  filter[Op.and] = [...filter[Op.and], filterNotCancelledSalesInvoice];

  // approved sales invoice
  const filterApprovedSalesInvoice = { '$form.approval_status$': 1 };
  filter[Op.and] = [...filter[Op.and], filterApprovedSalesInvoice];

  // form date
  const filterFormDate = generateFilterFormDate(queryValue.minDate, queryValue.maxDate);
  filter[Op.and] = [...filter[Op.and], filterFormDate];

  // selected item
  if (queryValue.selectedItem.length > 0) {
    const selectedItemFilter = { '$items.item_id$': { [Op.in]: queryValue.selectedItem } };
    filter[Op.and] = [...filter[Op.and], selectedItemFilter];
  }

  // selected customer
  if (queryValue.selectedCustomer.length > 0) {
    const selectedCustomerFilter = { customerId: { [Op.in]: queryValue.selectedCustomer } };
    filter[Op.and] = [...filter[Op.and], selectedCustomerFilter];
  }

  // selected allocation
  if (queryValue.selectedAllocation.length > 0) {
    const selectedAllocationFilter = { '$items.allocation_id$': { [Op.in]: queryValue.selectedAllocation } };
    filter[Op.and] = [...filter[Op.and], selectedAllocationFilter];
  }

  return filter;
}

function generateFilterFormDate(minDate, maxDate) {
  return {
    '$form.date$': {
      [Op.between]: [minDate, maxDate],
    },
  };
}

module.exports = GetReport;
