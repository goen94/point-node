const Worker = require('@src/utils/Worker');
const ProcessSendDeleteApproval = require('../services/ProcessSendDeleteApproval');

class ProcessSendDeleteApprovalWorker {
  constructor({ tenantName, salesInvoiceId, options = {} }) {
    this.tenantName = tenantName;
    this.salesInvoiceId = salesInvoiceId;
    this.options = options;
  }

  call() {
    const job = () => {
      new ProcessSendDeleteApproval(this.tenantName, this.salesInvoiceId).call();
    };

    new Worker({
      title: `send sales invoice approval email - ${this.salesInvoiceId}`,
      job,
      options: this.options,
    }).call();
  }
}

module.exports = ProcessSendDeleteApprovalWorker;
