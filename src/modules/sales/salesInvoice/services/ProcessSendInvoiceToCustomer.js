const fs = require('fs/promises');
const path = require('path');
const htmlToPdf = require('html-pdf-node');
const moment = require('moment');
const logger = require('@src/config/logger');
const { Project } = require('@src/models').main;
const Mailer = require('@src/utils/Mailer');
const getCurrentTenantDatabase = require('@src/utils/getCurrentTenantDatabase');
const currencyFormat = require('@src/utils/currencyFormat');

class ProcessSendInvoiceToCustomer {
  constructor(tenantName, salesInvoiceId, sendInvoiceToCustomerDto) {
    this.tenantName = tenantName;
    this.salesInvoiceId = salesInvoiceId;
    this.sendInvoiceToCustomerDto = sendInvoiceToCustomerDto;
  }

  async call() {
    const tenantDatabase = await getCurrentTenantDatabase(this.tenantName);
    const { email, message } = this.sendInvoiceToCustomerDto;
    const salesInvoice = await tenantDatabase.SalesInvoice.findOne({ where: { id: this.salesInvoiceId } });
    const salesInvoiceForm = await salesInvoice.getForm();
    const maker = await salesInvoiceForm.getCreatedByUser();

    try {
      const emailBody = await generateEmailBody({ maker, salesInvoice, message });
      const attachmentPdf = await generateAttachmentPdf(tenantDatabase, {
        salesInvoiceForm,
        salesInvoice,
      });

      const { messageId, to } = await new Mailer({
        to: email,
        subject: `Sales Invoice from ${maker.name} - ${salesInvoiceForm.number}`,
        html: emailBody,
        attachments: [{ filename: `Sales Invoice - ${salesInvoiceForm.number}.pdf`, content: attachmentPdf }],
      }).call();
      logger.info(`Sales invoice email sent, id: ${messageId}, email: ${to}, sales invoice: ${salesInvoiceForm.number}}`);
    } catch (error) {
      logger.error(error);
    }
  }
}

async function generateEmailBody({ maker, salesInvoice, message }) {
  let emailBody = await fs.readFile(path.resolve(__dirname, '../mails/salesInvoiceCustomerNotif.html'), 'utf8');
  emailBody = emailBody.replace('{{customerName}}', salesInvoice.customerName);
  emailBody = emailBody.replace('{{makerName}}', maker.name);

  if (!message) {
    emailBody = emailBody.replace('{{message}}', '');
  } else {
    emailBody = emailBody.replace(
      '{{message}}',
      `
        Message: <br>
        ${message}
      `
    );
  }

  return emailBody;
}

async function generateAttachmentPdf(tenantDatabase, { salesInvoiceForm, salesInvoice }) {
  let pdfBody = await fs.readFile(path.resolve(__dirname, '../mails/salesInvoiceCustomerNotifAttachment.html'), 'utf8');
  let itemsHtml = '';

  const tenantName = tenantDatabase.sequelize.config.database.replace('point_', '');
  const project = await Project.findOne({ where: { code: tenantName } });
  const customer = await salesInvoice.getCustomer();
  const settingEndNote = await tenantDatabase.SettingEndNote.findOne();
  const settingLogo = await tenantDatabase.SettingLogo.findOne();

  const salesInvoiceItems = await salesInvoice.getItems();
  salesInvoiceItems.forEach((salesInvoiceItem, index) => {
    itemsHtml += `
    <tr>
      <td>${index + 1}</td>
      <td>${salesInvoiceItem.itemName}</td>
      <td class="text-right">${currencyFormat(salesInvoiceItem.quantity)} ${salesInvoiceItem.unit}</td>
      <td class="text-right">${currencyFormat(salesInvoiceItem.price)}</td>
      <td class="text-right">${currencyFormat(salesInvoiceItem.discountValue)}</td>
      <td class="text-left">${currencyFormat(salesInvoiceItem.getTotalPrice())}</td>
    </tr>
    `;
  });

  const { subTotal, taxBase, tax, amount } = await salesInvoice.getTotalDetails();
  pdfBody = pdfBody.replace('{{logoUrl}}', settingLogo.publicUrl);
  pdfBody = pdfBody.replace('{{companyName}}', project.name);
  pdfBody = pdfBody.replace('{{companyAddress}}', project.address || '');
  pdfBody = pdfBody.replace('{{companyPhone}}', project.phone || '');
  pdfBody = pdfBody.replace('{{date}}', moment(salesInvoiceForm.date).format('DD MMMM YYYY'));
  pdfBody = pdfBody.replace('{{invoiceNumber}}', salesInvoiceForm.number);
  pdfBody = pdfBody.replace('{{customerName}}', customer.name);
  pdfBody = pdfBody.replace('{{customerAddress}}', customer.address || '');
  pdfBody = pdfBody.replace('{{customerPhone}}', customer.phone || '');
  pdfBody = pdfBody.replace('{{items}}', itemsHtml);
  pdfBody = pdfBody.replace('{{subTotal}}', currencyFormat(subTotal));
  pdfBody = pdfBody.replace('{{discount}}', currencyFormat(salesInvoice.discountValue));
  pdfBody = pdfBody.replace('{{taxBase}}', currencyFormat(taxBase));
  pdfBody = pdfBody.replace('{{tax}}', currencyFormat(tax));
  pdfBody = pdfBody.replace('{{total}}', currencyFormat(amount));
  pdfBody = pdfBody.replace('{{notes}}', settingEndNote.salesInvoice);

  if (salesInvoice.referenceableType === 'SalesDeliveryNote') {
    const deliveryNote = await salesInvoice.getReferenceable({
      include: [
        { model: tenantDatabase.Form, as: 'form' },
        {
          model: tenantDatabase.DeliveryOrder,
          as: 'deliveryOrder',
          include: [
            {
              model: tenantDatabase.SalesOrder,
              as: 'salesOrder',
              include: [{ model: tenantDatabase.Form, as: 'form' }],
            },
          ],
        },
      ],
    });

    pdfBody = pdfBody.replace(
      '{{salesOrderNumber}}',
      `<tr>
        <td>Sales order number</td>
        <td>:</td>
        <td>${deliveryNote?.deliveryOrder?.salesOrder?.form?.number}</td>
      </tr>`
    );
  }

  const options = { format: 'A4' };
  const pdfBuffer = await htmlToPdf.generatePdf({ content: pdfBody }, options);

  return pdfBuffer;
}

module.exports = ProcessSendInvoiceToCustomer;
