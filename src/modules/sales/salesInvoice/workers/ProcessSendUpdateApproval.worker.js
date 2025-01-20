const Worker = require('@src/utils/Worker');
const ProcessSendUpdateApproval = require('../services/ProcessSendUpdateApproval');

class ProcessSendCreateApprovalWorker {
  constructor({ tenantName, salesInvoiceId, options = {} }) {
    this.tenantName = tenantName;
    this.salesInvoiceId = salesInvoiceId;
    this.options = options;
  }

  call() {
    const job = () => {
      new ProcessSendUpdateApproval(this.tenantName, this.salesInvoiceId).call();
    };

    new Worker({
      title: `send sales invoice approval email - ${this.salesInvoiceId}`,
      job,
      options: this.options,
    }).call();
  }
}

module.exports = ProcessSendCreateApprovalWorker;
