const Worker = require('@src/utils/Worker');
const ProcessSendInvoiceToCustomer = require('../services/ProcessSendInvoiceToCustomer');

class ProcessSendInvoiceToCustomerWorker {
  constructor({ tenantName, salesInvoiceId, sendInvoiceToCustomerDto }) {
    this.tenantName = tenantName;
    this.salesInvoiceId = salesInvoiceId;
    this.sendInvoiceToCustomerDto = sendInvoiceToCustomerDto;
  }

  call() {
    const job = () => {
      new ProcessSendInvoiceToCustomer(this.tenantName, this.salesInvoiceId, this.sendInvoiceToCustomerDto).call();
    };

    new Worker({ title: `send email sales invoice to customer - ${this.salesInvoiceId}`, job }).call();
  }
}

module.exports = ProcessSendInvoiceToCustomerWorker;
