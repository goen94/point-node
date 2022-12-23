const fs = require('fs/promises');
const path = require('path');
const moment = require('moment');
const logger = require('@src/config/logger');
const config = require('@src/config/config');
const tokenService = require('@src/modules/auth/services/token.service');
const Mailer = require('@src/utils/Mailer');
const currencyFormat = require('@src/utils/currencyFormat');

class ProcessSendCreateApproval {
  constructor(tenantDatabase, paymentOrderId) {
    this.tenantDatabase = tenantDatabase;
    this.paymentOrderId = paymentOrderId;
  }

  async call() {
    try {
      const paymentOrder = await this.tenantDatabase.PurchasePaymentOrder.findOne({ where: { id: this.paymentOrderId } });
      const paymentOrderForm = await paymentOrder.getForm();
      if (paymentOrderForm.approvalStatus !== 0) {
        return;
      }

      const maker = await paymentOrderForm.getCreatedByUser();
      const approver = await paymentOrderForm.getRequestApprovalToUser();

      const emailBody = await generateApprovalEmailBody({
        maker,
        approver,
        paymentOrderForm,
        paymentOrder,
      });
      const { messageId, to } = await new Mailer({
        jobTitle: 'Send Create Approval Email',
        to: approver.email,
        subject: `Create Approval Email - Purchase Payment Order ${paymentOrderForm.number}`,
        html: emailBody,
      }).call();

      logger.info(
        `Purchase payment order create approval email sent, id: ${messageId}, email: ${to}, purchase payment order: ${paymentOrderForm.number}}`
      );
    } catch (error) {
      logger.error(error);
    }
  }
}

async function generateApprovalEmailBody(
  { maker, approver, paymentOrderForm, paymentOrder }
) {
  let emailBody = await fs.readFile(path.resolve(__dirname, '../mails/paymentOrderApprovalSingle.html'), 'utf8');
  let itemsHtml = '';

  let index = 0;

  const invoices = await paymentOrder.getInvoices();
  let totalPurchaseInvoice = 0;
  for (const invoice of invoices) {
    const purchaseInvoice = await invoice.getPurchaseInvoice();
    const form = await purchaseInvoice.getForm();
    itemsHtml += `
    <tr>
      <td>${index + 1}</td>
      <td>${form.number}</td>
      <td>${form.notes || ''}</td>
      <td>${currencyFormat(invoice.available)}</td>
      <td>${currencyFormat(invoice.amount)}</td>
    </tr>
    `;
    totalPurchaseInvoice = parseFloat(totalPurchaseInvoice) + parseFloat(invoice.amount);
    index++;
  }

  const downPayments = await paymentOrder.getDownPayments();
  let totalPurchaseDownPayment = 0;
  for (const downPayment of downPayments) {
    const purchaseDownPayment = await downPayment.getPurchaseDownPayment();
    const form = await purchaseDownPayment.getForm();
    itemsHtml += `
    <tr>
      <td>${index + 1}</td>
      <td>${form.number}</td>
      <td>${form.notes || ''}</td>
      <td>${currencyFormat(downPayment.available)}</td>
      <td>${currencyFormat(downPayment.amount)}</td>
    </tr>
    `;
    totalPurchaseDownPayment = parseFloat(totalPurchaseDownPayment) + parseFloat(downPayment.amount);
    index++;
  }

  const returns = await paymentOrder.getReturns();
  let totalPurchaseReturn = 0;
  for (const pReturn of returns) {
    const purchaseReturn = await pReturn.getPurchaseDownPayment();
    const form = await purchaseReturn.getForm();
    itemsHtml += `
    <tr>
      <td>${index + 1}</td>
      <td>${form.number}</td>
      <td>${form.notes || ''}</td>
      <td>${currencyFormat(pReturn.available)}</td>
      <td>${currencyFormat(pReturn.amount)}</td>
    </tr>
    `;
    totalPurchaseReturn = parseFloat(totalPurchaseReturn) + parseFloat(pReturn.amount);
    index++;
  }

  const others = await paymentOrder.getOthers();
  let totalOther = 0;
  for (const other of others) {
    const coa = await other.getChartOfAccount();
    const type = await coa.getType();
    itemsHtml += `
    <tr>
      <td>${index + 1}</td>
      <td>${'['+ coa.number + '] ' + coa.alias}</td>
      <td>${other.notes || ''}</td>
      <td>${currencyFormat(other.amount)}</td>
      <td>${currencyFormat(other.amount)}</td>
    </tr>
    `;
    if (type.isDebit) {
      totalOther = parseFloat(totalOther) - parseFloat(other.amount);
    } else {
      totalOther = parseFloat(totalOther) + parseFloat(other.amount);
    }
    index++;
  }

  const emailApprovalToken = await generateEmailApprovalToken(paymentOrder, approver);
  const tenantWebsite = config.websiteUrl.replace('http://', `http://localhost:8080.`);

  emailBody = emailBody.replace('{{approverName}}', approver.name);
  emailBody = emailBody.replace('{{formNumber}}', paymentOrderForm.number);
  emailBody = emailBody.replace('{{formDate}}', moment(paymentOrderForm.date).format('DD MMMM YYYY'));
  emailBody = emailBody.replace('{{supplierName}}', paymentOrder.supplierName);
  emailBody = emailBody.replace('{{createdAt}}', moment(paymentOrderForm.createdAt).format('DD MMMM YYYY'));
  emailBody = emailBody.replace('{{createdBy}}', maker.name);
  emailBody = emailBody.replace('{{notes}}', paymentOrderForm.notes || '');
  emailBody = emailBody.replace('{{details}}', itemsHtml);
  emailBody = emailBody.replace('{{totalPurchaseInvoice}}', currencyFormat(totalPurchaseInvoice));
  emailBody = emailBody.replace('{{totalDownPayment}}', currencyFormat(totalPurchaseDownPayment));
  emailBody = emailBody.replace('{{totalPurchaseReturn}}', currencyFormat(totalPurchaseReturn));
  emailBody = emailBody.replace('{{totalOther}}', currencyFormat(totalOther));
  emailBody = emailBody.replace('{{totalAmount}}', currencyFormat(paymentOrder.amount));
  emailBody = emailBody.replace('{{checkLink}}', `${tenantWebsite}/purchase/payment-order/${paymentOrder.id}`);
  emailBody = emailBody.replace(
    '{{approveLink}}',
    `${config.websiteUrl}/approval?tenant=dev&crud-type=create&resource-type=SalesInvoice&action=approve&token=${emailApprovalToken}`
  );
  emailBody = emailBody.replace(
    '{{rejectLink}}',
    `${config.websiteUrl}/approval?tenant=dev&crud-type=create&resource-type=SalesInvoice&action=reject&token=${emailApprovalToken}`
  );

  return emailBody;
}

async function generateEmailApprovalToken(paymentOrder, approver) {
  const payload = {
    paymentOrderId: paymentOrder.id,
    userId: approver.id,
  };
  const expires = moment().add(7, 'days');

  const token = await tokenService.generatePayloadToken(payload, expires);

  return token;
}

module.exports = ProcessSendCreateApproval;
