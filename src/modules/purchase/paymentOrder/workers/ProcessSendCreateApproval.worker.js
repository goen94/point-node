const Worker = require('@src/utils/Worker');
const ProcessSendCreateApproval = require('../services/ProcessSendCreateApproval');

class ProcessSendCreateApprovalWorker {
  constructor({ tenantDatabase, paymentOrderId, options = {} }) {
    this.tenantDatabase = tenantDatabase;
    this.paymentOrderId = paymentOrderId;
    this.options = options;
  }

  call() {
    console.log('masuk')
    const job = () => {
      new ProcessSendCreateApproval(this.tenantDatabase, this.paymentOrderId).call();
    };

    new Worker({
      title: `send purchase payment order create approval email - ${this.paymentOrderId}`,
      job,
      options: this.options,
    }).call();
  }
}

module.exports = ProcessSendCreateApprovalWorker;
