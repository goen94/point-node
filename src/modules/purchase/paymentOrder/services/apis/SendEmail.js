const ProcessSendCreateApprovalWorker = require('../../workers/ProcessSendCreateApproval.worker');

class SendEmail {
  constructor(tenantDatabase) {
    this.tenantDatabase = tenantDatabase;
  }

  async call() {
    await sendEmailToApprover(this.tenantDatabase);
  }
}

async function sendEmailToApprover(tenantDatabase) {
  // first time email
  new ProcessSendCreateApprovalWorker({
    tenantDatabase,
    paymentOrderId: 7,
  }).call();
  // repeatable email
  const aDayInMiliseconds = 1000 * 60 * 60 * 24;
  new ProcessSendCreateApprovalWorker({
    tenantDatabase,
    paymentOrderId: 7,
    options: {
      repeat: {
        every: aDayInMiliseconds, // 1 day
        limit: 7,
      },
    },
  }).call();
}

module.exports = SendEmail;