const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const InsertInventoryRecord = require('@src/modules/inventory/services/InsertInventoryRecord');

class CreateFormApprove {
  constructor(tenantDatabase, { approver, salesInvoiceId }) {
    this.tenantDatabase = tenantDatabase;
    this.approver = approver;
    this.salesInvoiceId = salesInvoiceId;
  }

  async call() {
    const salesInvoice = await this.tenantDatabase.SalesInvoice.findOne({
      where: { id: this.salesInvoiceId },
      include: generateSalesInvoiceIncludes(this.tenantDatabase),
    });
    if (!salesInvoice) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Sales invoice is not exist');
    }

    const form = await salesInvoice.getForm();
    validate(form, this.approver);
    if (form.approvalStatus === 1) {
      return { salesInvoice };
    }
    await this.tenantDatabase.sequelize.transaction(async (transaction) => {
      await updateInventory(this.tenantDatabase, { transaction, salesInvoice, form });
      await updateJournal(this.tenantDatabase, { transaction, salesInvoice, form });
      await form.update(
        {
          approvalStatus: 1,
          approvalBy: this.approver.id,
          approvalAt: new Date(),
        },
        { transaction }
      );
    });

    await salesInvoice.reload();
    return { salesInvoice };
  }
}

function validate(form, approver) {
  if (form.approvalStatus === -1) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Sales invoice already rejected');
  }
  // super admin
  if (approver.modelHasRole?.role?.name === 'super admin') {
    return true;
  }
  if (form.requestApprovalTo !== approver.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden - You are not the selected approver');
  }
}

function generateSalesInvoiceIncludes(tenantDatabase) {
  return [
    {
      model: tenantDatabase.SalesInvoiceItem,
      as: 'items',
      include: [{ model: tenantDatabase.Item, as: 'item' }],
    },
    { model: tenantDatabase.Form, as: 'form' },
  ];
}

async function updateJournal(tenantDatabase, { transaction, salesInvoice, form }) {
  await createJournalAccountReceivable(tenantDatabase, { transaction, salesInvoice, form });
  await createJournalSalesIncome(tenantDatabase, { transaction, salesInvoice, form });
  await createJournalInventoriesAndCogs(tenantDatabase, { transaction, salesInvoice, form });
  await createJournalTaxPayable(tenantDatabase, { transaction, salesInvoice, form });
}

async function createJournalAccountReceivable(tenantDatabase, { transaction, salesInvoice, form }) {
  const settingJournal = await getSettingJournal(tenantDatabase, { feature: 'sales', name: 'account receivable' });
  await tenantDatabase.Journal.create(
    {
      formId: form.id,
      journalableType: 'Customer',
      journalableId: salesInvoice.customerId,
      chartOfAccountId: settingJournal.chartOfAccountId,
      debit: salesInvoice.remaining,
    },
    { transaction }
  );
}

async function createJournalSalesIncome(tenantDatabase, { transaction, salesInvoice, form }) {
  const settingJournal = await getSettingJournal(tenantDatabase, { feature: 'sales', name: 'sales income' });
  await tenantDatabase.Journal.create(
    {
      formId: form.id,
      chartOfAccountId: settingJournal.chartOfAccountId,
      credit: salesInvoice.amount - salesInvoice.tax,
    },
    { transaction }
  );
}

async function createJournalInventoriesAndCogs(tenantDatabase, { transaction, salesInvoice, form }) {
  const costOfSalesSettingJournal = await getSettingJournal(tenantDatabase, { feature: 'sales', name: 'cost of sales' });
  const creations = salesInvoice.items.map(async (salesInvoiceItem) => {
    const cogs = await salesInvoiceItem.item.calculateCogs();

    await tenantDatabase.Journal.create(
      {
        formId: form.id,
        journalableType: 'Item',
        journalableId: salesInvoiceItem.itemId,
        chartOfAccountId: salesInvoiceItem.item.chartOfAccountId,
        credit: cogs * salesInvoiceItem.quantity,
      },
      { transaction }
    );

    await tenantDatabase.Journal.create(
      {
        formId: form.id,
        journalableType: 'Item',
        journalableId: salesInvoiceItem.itemId,
        chartOfAccountId: costOfSalesSettingJournal.chartOfAccountId,
        debit: cogs * salesInvoiceItem.quantity,
      },
      { transaction }
    );
  });

  await Promise.all(creations);
}

async function createJournalTaxPayable(tenantDatabase, { transaction, salesInvoice, form }) {
  const settingJournal = await getSettingJournal(tenantDatabase, { feature: 'sales', name: 'income tax payable' });
  await tenantDatabase.Journal.create(
    {
      formId: form.id,
      chartOfAccountId: settingJournal.chartOfAccountId,
      credit: salesInvoice.tax,
    },
    { transaction }
  );
}

async function getSettingJournal(tenantDatabase, { feature, name }) {
  const settingJournal = await tenantDatabase.SettingJournal.findOne({
    where: {
      feature,
      name,
    },
  });

  if (!settingJournal) {
    throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, `Journal ${feature} account - ${name} not found`);
  }

  return settingJournal;
}

async function updateInventory(tenantDatabase, { transaction, salesInvoice, form }) {
  const salesInvoiceItems = salesInvoice.items;
  const doUpdateInventory = salesInvoiceItems.map(async (salesInvoiceItem) => {
    if (salesInvoiceItem.quantity === 0) {
      return;
    }
    const item = await salesInvoiceItem.getItem();
    const reference = await salesInvoice.getReferenceable();
    const warehouse = await reference.getWarehouse();
    const quantity = Math.abs(salesInvoiceItem.quantity) * -1;

    return new InsertInventoryRecord(tenantDatabase, {
      form,
      warehouse,
      item,
      quantity,
      unit: salesInvoiceItem.unit,
      converter: salesInvoiceItem.converter,
      options: {
        expiryDate: salesInvoiceItem.expiryDate,
        productionNumber: salesInvoiceItem.productionNumber,
      },
      transaction,
    }).call();
  });

  await Promise.all(doUpdateInventory);
}

module.exports = CreateFormApprove;
