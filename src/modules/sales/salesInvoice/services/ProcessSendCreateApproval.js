const fs = require('fs/promises');
const path = require('path');
const moment = require('moment');
const logger = require('@src/config/logger');
const config = require('@src/config/config');
const tokenService = require('@src/modules/auth/services/token.service');
const Mailer = require('@src/utils/Mailer');
const getCurrentTenantDatabase = require('@src/utils/getCurrentTenantDatabase');
const currencyFormat = require('@src/utils/currencyFormat');

class ProcessSendCreateApproval {
  constructor(tenantName, salesInvoiceId) {
    this.tenantName = tenantName;
    this.salesInvoiceId = salesInvoiceId;
  }

  async call() {
    try {
      const tenantDatabase = await getCurrentTenantDatabase(this.tenantName);
      const salesInvoice = await tenantDatabase.SalesInvoice.findOne({ where: { id: this.salesInvoiceId } });
      const salesInvoiceForm = await salesInvoice.getForm();
      if (salesInvoiceForm.approvalStatus !== 0) {
        return;
      }

      const maker = await salesInvoiceForm.getCreatedByUser();
      const approver = await salesInvoiceForm.getRequestApprovalToUser();
      const reference = await salesInvoice.getReferenceable();
      const formReference = await reference.getForm();

      const emailBody = await generateApprovalEmailBody(tenantDatabase, {
        tenantName: this.tenantName,
        maker,
        approver,
        salesInvoiceForm,
        formReference,
        salesInvoice,
      });
      const { messageId, to } = await new Mailer({
        jobTitle: 'Send Create Approval Email',
        to: approver.email,
        subject: `Create Approval Email - Sales Invoice ${salesInvoiceForm.number}`,
        html: emailBody,
      }).call();

      logger.info(
        `Sales invoice create approval email sent, id: ${messageId}, email: ${to}, sales invoice: ${salesInvoiceForm.number}}`
      );
    } catch (error) {
      logger.error(error);
    }
  }
}

async function generateApprovalEmailBody(
  tenantDatabase,
  { tenantName, maker, approver, salesInvoiceForm, formReference, salesInvoice }
) {
  let emailBody = await fs.readFile(path.resolve(__dirname, '../mails/salesInvoiceApproval.html'), 'utf8');
  let itemsHtml = '';

  const salesInvoiceItems = await salesInvoice.getItems({
    include: [{ model: tenantDatabase.Allocation, as: 'allocation' }],
  });
  salesInvoiceItems.forEach((salesInvoiceItem, index) => {
    itemsHtml += `
    <tr>
      <td>${index + 1}</td>
      <td>${salesInvoiceItem.itemName}</td>
      <td>${salesInvoiceItem?.allocation?.name || ''}</td>
      <td>${currencyFormat(salesInvoiceItem.quantity)} ${salesInvoiceItem.unit}</td>
      <td>${currencyFormat(salesInvoiceItem.price)}</td>
      <td>${currencyFormat(salesInvoiceItem.discountValue)}</td>
      <td>${currencyFormat(salesInvoiceItem.getTotalPrice())}</td>
    </tr>
    `;
  });

  const { subTotal, taxBase, tax, amount } = await salesInvoice.getTotalDetails();

  const emailApprovalToken = await generateEmailApprovalToken(salesInvoice, approver);
  const tenantWebsite = config.websiteUrl.replace('http://', `http:://${tenantName}.`);

  emailBody = emailBody.replace('{{approvalType}}', 'a <b>CREATE</b>');
  emailBody = emailBody.replace('{{approverName}}', approver.name);
  emailBody = emailBody.replace('{{formNumber}}', salesInvoiceForm.number);
  emailBody = emailBody.replace('{{formDate}}', moment(salesInvoiceForm.date).format('DD MMMM YYYY'));
  emailBody = emailBody.replace('{{formReference}}', formReference.number);
  emailBody = emailBody.replace('{{customerName}}', salesInvoice.customerName);
  emailBody = emailBody.replace('{{createdAt}}', moment(salesInvoiceForm.createdAt).format('DD MMMM YYYY'));
  emailBody = emailBody.replace('{{createdBy}}', maker.name);
  emailBody = emailBody.replace('{{notes}}', salesInvoiceForm.notes || '');
  emailBody = emailBody.replace('{{items}}', itemsHtml);
  emailBody = emailBody.replace('{{subTotal}}', currencyFormat(subTotal));
  emailBody = emailBody.replace('{{discount}}', currencyFormat(salesInvoice.discountValue));
  emailBody = emailBody.replace('{{taxBase}}', currencyFormat(taxBase));
  emailBody = emailBody.replace('{{tax}}', currencyFormat(tax));
  emailBody = emailBody.replace('{{total}}', currencyFormat(amount));
  emailBody = emailBody.replace('{{checkLink}}', `${tenantWebsite}/sales/invoice/${salesInvoice.id}`);
  emailBody = emailBody.replace(
    '{{approveLink}}',
    `${config.websiteUrl}/approval?tenant=${tenantName}&crud-type=create&resource-type=SalesInvoice&action=approve&token=${emailApprovalToken}`
  );
  emailBody = emailBody.replace(
    '{{rejectLink}}',
    `${config.websiteUrl}/approval?tenant=${tenantName}&crud-type=create&resource-type=SalesInvoice&action=reject&token=${emailApprovalToken}`
  );

  return emailBody;
}

async function generateEmailApprovalToken(salesInvoice, approver) {
  const payload = {
    salesInvoiceId: salesInvoice.id,
    userId: approver.id,
  };
  const expires = moment().add(7, 'days');

  const token = await tokenService.generatePayloadToken(payload, expires);

  return token;
}

module.exports = ProcessSendCreateApproval;
