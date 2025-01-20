const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const ProcessSendInvoiceToCustomerWorker = require('../../workers/ProcessSendInvoiceToCustomer.worker');

class SendInvoiceToCustomer {
  constructor(tenantDatabase, { salesInvoiceId, sendInvoiceToCustomerDto }) {
    this.tenantDatabase = tenantDatabase;
    this.salesInvoiceId = salesInvoiceId;
    this.sendInvoiceToCustomerDto = sendInvoiceToCustomerDto;
  }

  async call() {
    const salesInvoice = await this.tenantDatabase.SalesInvoice.findOne({ where: { id: this.salesInvoiceId } });
    if (!salesInvoice) {
      throw new ApiError(httpStatus.NOT_FOUND, 'sales invoice is not exist');
    }

    const tenantName = this.tenantDatabase.sequelize.config.database.replace('point_', '');

    new ProcessSendInvoiceToCustomerWorker({
      tenantName,
      salesInvoiceId: salesInvoice.id,
      sendInvoiceToCustomerDto: this.sendInvoiceToCustomerDto,
    }).call();

    return true;
  }
}

module.exports = SendInvoiceToCustomer;
