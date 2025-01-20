const fs = require('fs/promises');
const path = require('path');
const moment = require('moment');
const logger = require('@src/config/logger');
const config = require('@src/config/config');
const tokenService = require('@src/modules/auth/services/token.service');
const Mailer = require('@src/utils/Mailer');
const getCurrentTenantDatabase = require('@src/utils/getCurrentTenantDatabase');
const GetCurrentStock = require('../../services/GetCurrentStock');

class ProcessSendUpdateApproval {
  constructor(tenantName, stockCorrectionId) {
    this.tenantName = tenantName;
    this.stockCorrectionId = stockCorrectionId;
  }

  async call() {
    const tenantDatabase = await getCurrentTenantDatabase(this.tenantName);
    const stockCorrection = await tenantDatabase.StockCorrection.findOne({
      where: { id: this.stockCorrectionId },
      include: [
        { model: tenantDatabase.Warehouse, as: 'warehouse' },
        {
          model: tenantDatabase.StockCorrectionItem,
          as: 'items',
          include: [
            { model: tenantDatabase.Item, as: 'item' },
            { model: tenantDatabase.Allocation, as: 'allocation' },
          ],
        },
      ],
    });
    const stockCorrectionForm = await stockCorrection.getForm();
    if (stockCorrectionForm.approvalStatus !== 0) {
      return;
    }

    const maker = await stockCorrectionForm.getCreatedByUser();
    const approver = await stockCorrectionForm.getRequestApprovalToUser();

    try {
      const emailBody = await generateApprovalEmailBody(tenantDatabase, {
        tenantName: this.tenantName,
        maker,
        approver,
        stockCorrectionForm,
        stockCorrection,
      });
      const { messageId, to } = await new Mailer({
        jobTitle: 'Send Update Approval Email',
        to: approver.email,
        subject: `Update Approval Email - Stock Correction ${stockCorrectionForm.number}`,
        html: emailBody,
      }).call();

      logger.info(
        `Stock correction update approval email sent, id: ${messageId}, email: ${to}, stock correction: ${stockCorrectionForm.number}}`
      );
    } catch (error) {
      logger.error(error);
    }
  }
}

async function generateApprovalEmailBody(
  tenantDatabase,
  { tenantName, maker, approver, stockCorrectionForm, stockCorrection }
) {
  let emailBody = await fs.readFile(path.resolve(__dirname, '../mails/stockCorrectionApproval.html'), 'utf8');
  let itemsHtml = '';

  let { items: stockCorrectionItems } = stockCorrection;
  stockCorrectionItems = await Promise.all(
    stockCorrectionItems.map(async (stockCorrectionItem) => {
      const currentStock = await new GetCurrentStock(tenantDatabase, {
        item: stockCorrectionItem.item,
        date: stockCorrectionForm.date,
        warehouseId: stockCorrection.warehouseId,
        options: {
          expiryDate: stockCorrectionItem.expiryDate,
          productionNumber: stockCorrectionItem.productionNumber,
        },
      }).call();

      stockCorrectionItem.initialStock = currentStock;
      stockCorrectionItem.finalStock = currentStock + stockCorrectionItem.quantity;

      return stockCorrectionItem;
    })
  );
  stockCorrectionItems.forEach((stockCorrectionItem, index) => {
    itemsHtml += `
    <tr>
      <td>${index + 1}</td>
      <td>
        ${stockCorrectionItem.item.label} 
        ${stockCorrectionItem.item.requireProductionNumber ? `(PID: ${stockCorrectionItem.productionNumber})` : ''} 
        ${
          stockCorrectionItem.item.requireExpiryDate
            ? `(E/D: ${moment(stockCorrectionForm.expiryDate).format('DD MMMM YYYY')})`
            : ''
        }
      </td>
      <td>${stockCorrectionItem.allocation?.name || ''}</td>
      <td>${stockCorrectionItem.initialStock}</td>
      <td>${stockCorrectionItem.quantity}</td>
      <td>${stockCorrectionItem.finalStock}</td>
      <td>${stockCorrectionItem.notes || ''}</td>
    </tr>
    `;
  });

  const emailApprovalToken = await generateEmailApprovalToken(stockCorrection, approver);
  const tenantWebsite = config.websiteUrl.replace('http://', `http:://${tenantName}.`);

  emailBody = emailBody.replace('{{approvalType}}', 'an <b>UPDATE</b>');
  emailBody = emailBody.replaceAll('{{approverName}}', approver.name);
  emailBody = emailBody.replaceAll('{{formNumber}}', stockCorrectionForm.number);
  emailBody = emailBody.replaceAll('{{formDate}}', moment(stockCorrectionForm.date).format('DD MMMM YYYY'));
  emailBody = emailBody.replaceAll('{{warehouseName}}', stockCorrection.warehouse.name);
  emailBody = emailBody.replaceAll('{{createdAt}}', moment(stockCorrectionForm.createdAt).format('DD MMMM YYYY'));
  emailBody = emailBody.replaceAll('{{createdBy}}', maker.name);
  emailBody = emailBody.replaceAll('{{notes}}', stockCorrectionForm.notes || '');
  emailBody = emailBody.replaceAll('{{items}}', itemsHtml);
  emailBody = emailBody.replaceAll('{{checkLink}}', `${tenantWebsite}/inventory/correction/${stockCorrection.id}`);
  emailBody = emailBody.replaceAll(
    '{{approveLink}}',
    `${config.websiteUrl}/approval?tenant=${tenantName}&crud-type=update&resource-type=StockCorrection&action=approve&token=${emailApprovalToken}`
  );
  emailBody = emailBody.replaceAll(
    '{{rejectLink}}',
    `${config.websiteUrl}/approval?tenant=${tenantName}&crud-type=update&resource-type=StockCorrection&action=reject&token=${emailApprovalToken}`
  );

  return emailBody;
}

async function generateEmailApprovalToken(stockCorrection, approver) {
  const payload = {
    stockCorrectionId: stockCorrection.id,
    userId: approver.id,
  };
  const expires = moment().add(7, 'days');

  const token = await tokenService.generatePayloadToken(payload, expires);

  return token;
}

module.exports = ProcessSendUpdateApproval;
