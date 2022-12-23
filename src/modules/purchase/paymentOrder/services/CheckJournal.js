const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');

class CheckJournal {
  constructor(tenantDatabase, { amount, invoices, downPayments, returns, others }) {
    this.tenantDatabase = tenantDatabase;
    this.amount = amount;
    this.invoices = invoices;
    this.downPayments = downPayments;
    this.returns = returns;
    this.others = others;
  }

  async call() {
    await getSettingJournal(this.tenantDatabase, { feature: 'purchase', name: 'account payable' });
    await getSettingJournal(this.tenantDatabase, { feature: 'purchase', name: 'down payment' });

    let debit = 0
    let credit = this.amount

    for (const invoice of this.invoices) {
      debit = parseFloat(debit) + parseFloat(invoice.amount);
    }

    for (const downPayment of this.downPayments) {
      credit = parseFloat(credit) + parseFloat(downPayment.amount);
    }

    for (const pReturn of this.returns) {
      debit = parseFloat(debit) - parseFloat(pReturn.amount);
    }

    for (const other of this.others) {
      const coa = await this.tenantDatabase.ChartOfAccount.findOne({
        where: { id: other.coaId },
        include: [
          {
            model: this.tenantDatabase.ChartOfAccountType,
            as: 'type',
          },
        ],
      });

      if (coa.type.isDebit) {
        debit = parseFloat(debit) + parseFloat(other.amount);
      } else {
        credit = parseFloat(credit) + parseFloat(other.amount);
      }
    }

    let isBalance = true;
    if (debit != credit) {
      isBalance = false;
    }

    return { isBalance, debit, credit }
  }
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

module.exports = CheckJournal;