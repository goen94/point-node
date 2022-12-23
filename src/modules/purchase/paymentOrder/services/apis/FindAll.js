const { Op } = require('sequelize');
const validatePermission = require('@src/utils/permission');
const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');

class FindAll {
  constructor(tenantDatabase, user, queries = {}) {
    this.tenantDatabase = tenantDatabase;
    this.user = user;
    this.queries = queries;
  }

  async call() {
    await validate(this.tenantDatabase, this.user);
    const [queryLimit, queryPage] = [parseInt(this.queries.limit, 10) || 10, parseInt(this.queries.page, 10) || 1];
    const { count: total, rows: paymentOrder } = await this.tenantDatabase.PurchasePaymentOrder.findAndCountAll({
      where: generateFilter(this.queries),
      include: [
        {
          model: this.tenantDatabase.PurchasePaymentOrderDetails,
          as: 'invoices',
          include: [
            {
              model: this.tenantDatabase.PurchaseInvoice,
              as: 'purchaseInvoice',
              include: [{ model: this.tenantDatabase.Form, as: 'form' }],
            }
          ],
        },
        {
          model: this.tenantDatabase.PurchasePaymentOrderDetails,
          as: 'downPayments',
          include: [
            {
              model: this.tenantDatabase.PurchaseDownPayment,
              as: 'purchaseDownPayment',
              include: [{ model: this.tenantDatabase.Form, as: 'form' }],
            }
          ],
        },
        {
          model: this.tenantDatabase.PurchasePaymentOrderDetails,
          as: 'returns',
          include: [
            {
              model: this.tenantDatabase.PurchaseReturn,
              as: 'purchaseReturn',
              include: [{ model: this.tenantDatabase.Form, as: 'form' }],
            }
          ],
        },
        {
          model: this.tenantDatabase.PurchasePaymentOrderDetails,
          as: 'others',
        },
        {
          model: this.tenantDatabase.Form,
          as: 'form',
          include: [
            { model: this.tenantDatabase.User, as: 'requestApprovalToUser' },
            { model: this.tenantDatabase.User, as: 'createdByUser' },
          ],
        },
        { model: this.tenantDatabase.Supplier, as: 'supplier' },
      ],
      order: [['form', 'created_at', 'DESC']],
      limit: queryLimit,
      offset: offsetParams(queryPage, queryLimit),
      subQuery: false,
    });

    const totalPage = Math.ceil(total / parseInt(queryLimit, 10));

    return { total, paymentOrder, maxItem: queryLimit, currentPage: queryPage, totalPage };
  }
}

function generateFilter(queries) {
  const filter = { [Op.and]: [] };

  // form date
  const filterFormDate = generateFilterFormDate(queries);
  filter[Op.and] = [...filter[Op.and], filterFormDate];

  // form status
  const filterFormStatus = generateFilterFormStatus(queries.filter_form);
  filter[Op.and] = [...filter[Op.and], ...filterFormStatus];

  // like
  const filterLike = generateFilterLike(queries.filter_like);
  if (filterLike.length > 0) {
    filter[Op.and] = [...filter[Op.and], { [Op.or]: filterLike }];
  }

  return filter;
}

function generateFilterLike(likeQueries) {
  if (!likeQueries) {
    return [];
  }

  const filtersObject = JSON.parse(likeQueries);
  const filterKeys = Object.keys(filtersObject);

  const result = filterKeys.map((key) => {
    const likeKey = key.split('.').length > 1 ? `$${key}$` : key;

    return {
      [likeKey]: { [Op.substring]: filtersObject[key] || '' },
    };
  });

  return result;
}

function generateFilterFormDate(queries) {
  let minDate = new Date();
  minDate.setDate(new Date().getDate() - 30);
  if (queries.filter_date_min) {
    minDate = new Date(queries.filter_date_min);
  }
  minDate.setHours(0, 0, 0, 0);

  let maxDate = new Date();
  if (queries.filter_date_max) {
    maxDate = new Date(queries.filter_date_max);
  }
  maxDate.setHours(24, 0, 0, 0);

  return {
    '$form.date$': {
      [Op.between]: [minDate, maxDate],
    },
  };
}

function generateFilterFormStatus(formQueries) {
  if (!formQueries) {
    return [];
  }

  const result = [];
  const [doneStatus, approvalStatus] = formQueries.split(';');

  const doneStatuses = {
    pending: false,
    done: true,
  };

  const approvalStatusses = {
    approvalPending: 0,
    approvalApproved: 1,
    approvalRejected: -1,
  };

  if (doneStatus !== 'null') {
    if (doneStatus === 'cancellationApproved') {
      result.push({ '$form.cancellation_status$': 1 });
    }

    if (doneStatus !== 'cancellationApproved') {
      result.push({ '$form.cancellation_status$': null });
      result.push({ '$form.done$': doneStatuses[doneStatus] });
    }
  }

  if (approvalStatus !== 'null') {
    result.push({ '$form.approval_status$': approvalStatusses[approvalStatus] });
  }

  return result;
}

function offsetParams(page, maxItem) {
  return page > 1 ? maxItem * (page - 1) : 0;
}

async function validate(tenantDatabase, user) {
  await validateBranch(tenantDatabase, user);
  await validatePermission(tenantDatabase, { userId: user.id, module: 'purchase payment order', action: 'read' });
}

async function validateBranch(tenantDatabase, user) {
  const branchDefault = await tenantDatabase.BranchUser.findOne({
    where: { userId: user.id, isDefault: 1 },
  });

  if (!branchDefault) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'please set default branch to read this form');
  }
}

module.exports = FindAll;
