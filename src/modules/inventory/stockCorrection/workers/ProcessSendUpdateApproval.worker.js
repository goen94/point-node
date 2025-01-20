const Worker = require('@src/utils/Worker');
const ProcessSendUpdateApproval = require('../services/ProcessSendUpdateApproval');

class ProcessSendUpdateApprovalWorker {
  constructor({ tenantName, stockCorrectionId, options = {} }) {
    this.tenantName = tenantName;
    this.stockCorrectionId = stockCorrectionId;
    this.options = options;
  }

  call() {
    const job = () => {
      new ProcessSendUpdateApproval(this.tenantName, this.stockCorrectionId).call();
    };

    new Worker({
      title: `send stock correction delete approval email - ${this.stockCorrectionId}`,
      job,
      options: this.options,
    }).call();
  }
}

module.exports = ProcessSendUpdateApprovalWorker;
