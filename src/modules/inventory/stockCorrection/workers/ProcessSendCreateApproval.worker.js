const Worker = require('@src/utils/Worker');
const ProcessSendCreateApproval = require('../services/ProcessSendCreateApproval');

class ProcessSendCreateApprovalWorker {
  constructor({ tenantName, stockCorrectionId, options = {} }) {
    this.tenantName = tenantName;
    this.stockCorrectionId = stockCorrectionId;
    this.options = options;
  }

  call() {
    const job = () => {
      new ProcessSendCreateApproval(this.tenantName, this.stockCorrectionId).call();
    };

    new Worker({
      title: `send stock correction create approval email - ${this.stockCorrectionId}`,
      job,
      options: this.options,
    }).call();
  }
}

module.exports = ProcessSendCreateApprovalWorker;
