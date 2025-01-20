const Worker = require('@src/utils/Worker');
const ProcessSendCreateApproval = require('../services/ProcessSendCreateApproval');

class ProcessSendCreateApprovalWorker {
  constructor({ tenantName, salesInvoiceId, options = {} }) {
    this.tenantName = tenantName;
    this.salesInvoiceId = salesInvoiceId;
    this.options = options;
  }

  call() {
    const job = () => {
      new ProcessSendCreateApproval(this.tenantName, this.salesInvoiceId).call();
    };

    new Worker({
      title: `send sales invoice approval email - ${this.salesInvoiceId}`,
      job,
      options: this.options,
    }).call();
  }
}

module.exports = ProcessSendCreateApprovalWorker;
