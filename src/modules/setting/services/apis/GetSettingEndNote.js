class GetSettingEndNote {
  constructor(tenantDatabase) {
    this.tenantDatabase = tenantDatabase;
  }

  async call() {
    const settingEndNote = await this.tenantDatabase.SettingEndNote.findOne();
    if (!settingEndNote) {
      return {
        settingEndNote: {
          purchaseRequest: '',
          purchaseOrder: '',
          purchaseDownPayment: '',
          purchaseReceive: '',
          purchaseInvoice: '',
          purchaseReturn: '',
          paymentOrderPurchase: '',
          pointOfSales: '',
          salesQuotation: '',
          salesOrder: '',
          salesDownPayment: '',
          salesInvoice: '',
          salesReturn: '',
          paymentCollectionSales: '',
          expeditionOrder: '',
          expeditionDownPayment: '',
          expeditionInvoice: '',
          paymentOrderExpedition: '',
        },
      };
    }

    return { settingEndNote };
  }
}

module.exports = GetSettingEndNote;
