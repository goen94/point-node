const { Op } = require('sequelize');

class FindAllReferenceForm {
  constructor(tenantDatabase, supplierId) {
    this.tenantDatabase = tenantDatabase;
    this.supplierId = supplierId;
  }

  async call() {
    const invoices = await this.getInvoices()
    const downPayments = await this.getDownPayments()
    return { invoices, downPayments }
  }

  async getInvoices() {
    const purchaseInvoices = await this.tenantDatabase.PurchaseInvoice.findAll({
      where: { supplierId: this.supplierId },
      include: [
        {
          model: this.tenantDatabase.Form,
          as: 'form',
          where: { approvalStatus: 1, done: 0 }
        },
        {
          model: this.tenantDatabase.PurchasePaymentOrderDetails,
          as: 'paymentOrderDetails',
          include: [
            {
              model: this.tenantDatabase.PurchasePaymentOrder,
              as: 'purchasePaymentOrder',
              include: [
                {
                  model: this.tenantDatabase.Form,
                  as: 'form',
                  where: { cancellationStatus: { [Op.or]: [{ [Op.is]: null }, { [Op.ne]: 1 }] } }
                },
              ]
            }
          ]
        }
      ]
    });

    const invoices = [];
    purchaseInvoices.forEach(purchaseInvoice => {
      let available = purchaseInvoice.amount;
      purchaseInvoice.paymentOrderDetails.forEach(paymentOrderDetail => {
        available = parseFloat(available) - parseFloat(paymentOrderDetail.amount);
      })

      invoices.push({
        id: purchaseInvoice.id,
        date: purchaseInvoice.form.date,
        number: purchaseInvoice.form.number,
        notes: purchaseInvoice.form.notes,
        available
      });
    });
    return { invoices }
  }

  async getDownPayments() {
    const purchaseDownPayments = await this.tenantDatabase.PurchaseDownPayment.findAll({
      where: { supplierId: this.supplierId },
      include: [
        {
          model: this.tenantDatabase.Form,
          as: 'form',
          where: { approvalStatus: 1, done: 0 }
        },
        {
          model: this.tenantDatabase.PurchasePaymentOrderDetails,
          as: 'paymentOrderDetails',
          include: [
            {
              model: this.tenantDatabase.PurchasePaymentOrder,
              as: 'purchasePaymentOrder',
              include: [
                {
                  model: this.tenantDatabase.Form,
                  as: 'form',
                  where: { approvalStatus: 1}
                },
              ]
            }
          ]
        }
      ]
    });

    const downPayments = [];
    purchaseDownPayments.forEach(purchaseDownPayment => {
      let available = purchaseDownPayment.amount;
      purchaseDownPayment.paymentOrderDetails.forEach(paymentOrderDetail => {
        available = parseFloat(available) - parseFloat(paymentOrderDetail.amount);
      })

      downPayments.push({
        id: purchaseDownPayment.id,
        date: purchaseDownPayment.form.date,
        number: purchaseDownPayment.form.number,
        notes: purchaseDownPayment.form.notes,
        available
      });
    });
    return { downPayments }
  }
}

module.exports = FindAllReferenceForm;
