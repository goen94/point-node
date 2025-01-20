class FindOne {
  constructor(tenantDatabase, salesInvoiceId) {
    this.tenantDatabase = tenantDatabase;
    this.salesInvoiceId = salesInvoiceId;
  }

  async call() {
    const salesInvoice = await this.tenantDatabase.SalesInvoice.findOne({
      where: {
        id: this.salesInvoiceId,
      },
      include: [
        {
          model: this.tenantDatabase.SalesInvoiceItem,
          as: 'items',
          include: [{ model: this.tenantDatabase.Allocation, as: 'allocation' }],
        },
        {
          model: this.tenantDatabase.Form,
          as: 'form',
          include: [
            { model: this.tenantDatabase.User, as: 'requestApprovalToUser' },
            { model: this.tenantDatabase.User, as: 'createdByUser' },
          ],
        },
        { model: this.tenantDatabase.Customer, as: 'customer' },
        {
          model: this.tenantDatabase.DeliveryNote,
          as: 'salesDeliveryNote',
          include: [
            { model: this.tenantDatabase.Form, as: 'form' },
            {
              model: this.tenantDatabase.DeliveryOrder,
              as: 'deliveryOrder',
              include: [
                {
                  model: this.tenantDatabase.SalesOrder,
                  as: 'salesOrder',
                  include: [{ model: this.tenantDatabase.Form, as: 'form' }],
                },
              ],
            },
          ],
        },
      ],
    });
    await salesInvoice.setReferenceable({
      include: [{ model: this.tenantDatabase.Form, as: 'form' }],
    });

    return { salesInvoice };
  }
}

module.exports = FindOne;
