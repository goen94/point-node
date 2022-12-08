describe('Payment Order - DeleteFormApprove', () => {
  describe('approve fail', () => {
    it('throw if form already approved', async () => {
      const { approver, paymentOrder, formPaymentOrder } = await generateRecordFactories();
      await formPaymentOrder.update({ cancellationStatus: 1, requestCancellationTo: approver.id });

      await expect(async () => {
        await new DeleteFormApprove(tenantDatabase, { approver, paymentOrderId: paymentOrder.id }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'form already cancelled'));
    })

    it('throw error when approved by unwanted user', async () => {
      const hacker = await factory.user.create();
      const { paymentOrder, formPaymentOrder, approver } = await generateRecordFactories();
      await formPaymentOrder.update({ cancellationStatus: 0, requestCancellationTo: approver.id });

      await expect(async () => {
        await new DeleteFormApprove(tenantDatabase, { approver: hacker, paymentOrderId: paymentOrder.id }).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'Forbidden - You are not the selected approver'));
    });
  })

  describe('approve success', () => {
    it('check form status', async () => {
      const { approver, paymentOrder } = await generateRecordFactories();
      ({ paymentOrder } = await new DeleteFormApprove(tenantDatabase, { approver, paymentOrderId: paymentOrder.id }).call());

      expect(paymentOrder.form.cancellationStatus).toEqual(1);
    });

    it('check available invoice ', async () => {
      const { approver, paymentOrder, purchaseInvoice, purchaseDownPayment, purchaseReturn, supplier } = await generateRecordFactories();
      ({ paymentOrder } = await new DeleteFormApprove(tenantDatabase, { approver, paymentOrderId: paymentOrder.id }).call());

      ({ reference } = await new GetReferences(tenantDatabase, { supplierId: supplier.id }).call());
      expect(reference.invoices[0].available).toEqual(purchaseInvoice.amount);
      expect(reference.downPayments[0].available).toEqual(purchaseDownPayment.amount);
      expect(reference.returns[0].available).toEqual(purchaseReturn.amount);
    });

    describe('check form reference pending', () => {
      beforeEach(async (done) => {
        const { approver, paymentOrder } = await generateRecordFactories();
        ({ paymentOrder } = await new DeleteFormApprove(tenantDatabase, { approver, paymentOrderId: paymentOrder.id }).call());

        done();
      });

      it('check form invoice', async () => {
        const form = await tenantDatabase.Form.findOne({
          where: {
            formableId: paymentOrder.invoices[0].id,
            formableType: 'PurchaseInvoice',
          }
        })
        expect(form.done).toEqual(0)
      })

      it('check form down payment', async () => {
        const form = await tenantDatabase.Form.findOne({
          where: {
            formableId: paymentOrder.downPayments[0].id,
            formableType: 'PurchaseDownPayment',
          }
        })
        expect(form.done).toEqual(0)
      })

      it('check form return', async () => {
        const form = await tenantDatabase.Form.findOne({
          where: {
            formableId: paymentOrder.returns[0].id,
            formableType: 'PurchaseReturn',
          }
        })
        expect(form.done).toEqual(0)
      })
    })
  })
});

const generateRecordFactories = async ({
  maker,
  approver,
  branch,
  branchUser,
  supplier,
  item,
  itemUnit,
  allocation,
  purchaseInvoice,
  formPurchaseInvoice,
  purchaseDownPayment,
  formPurchaseDownPayment,
  purchaseReturn,
  formPurchaseReturn,
  paymentOrder,
  paymentOrderDetails,
  formPaymentOrder,
} = {}) => {
  await factory.permission.create('payment order');
  const chartOfAccountType = await tenantDatabase.ChartOfAccountType.create({
    name: 'account payable',
    alias: 'hutang usaha',
    isDebit: false,
  });
  const chartOfAccount = await tenantDatabase.ChartOfAccount.create({
    typeId: chartOfAccountType.id,
    position: '',
    name: 'account payable',
    alias: 'hutang dagang',
  });
  await tenantDatabase.SettingJournal.create({
    feature: 'purchase',
    name: 'account payable',
    description: 'account payable',
    chartOfAccountId: chartOfAccount.id,
  });
  const chartOfAccountTypeExpense = await tenantDatabase.ChartOfAccountType.create({
    name: 'direct expense',
    alias: 'beban operasional',
    isDebit: true,
  });
  const chartOfAccountExpense = await tenantDatabase.ChartOfAccount.create({
    typeId: chartOfAccountTypeExpense.id,
    position: '',
    name: 'other expense',
    alias: 'beban lain-lain',
  });
  const chartOfAccountTypeIncome = await tenantDatabase.ChartOfAccountType.create({
    name: 'other income',
    alias: 'pendapatan lain-lain',
    isDebit: false,
  });
  const chartOfAccountIncome = await tenantDatabase.ChartOfAccount.create({
    typeId: chartOfAccountTypeIncome.id,
    position: '',
    name: 'other income',
    alias: 'pendapatan lain-lain',
  });
  maker = maker || (await factory.user.create());
  approver = approver || (await factory.user.create());
  branch = branch || (await factory.branch.create());
  // create relation between maker and branch for authorization
  branchUser = branchUser || (await factory.branchUser.create({ user: maker, branch, isDefault: true }));
  supplier = supplier || (await factory.supplier.create({ branch }));
  // create relation between maker and warehouse for authorization
  item = item || (await factory.item.create());
  itemUnit = itemUnit || (await factory.itemUnit.create({ item, createdBy: maker.id }));
  allocation = allocation || (await factory.allocation.create({ branch }));
  purchaseInvoice = purchaseInvoice || (await factory.purchaseInvoice.create({ supplier }));
  formPurchaseInvoice =
  formPurchaseInvoice ||
    (await factory.form.create({
      branch,
      number: 'PI2211001',
      formable: purchaseInvoice,
      formableType: 'PurchaseInvoice',
      createdBy: maker.id,
      updatedBy: maker.id,
      requestApprovalTo: approver.id,
    }));
  purchaseDownPayment = purchaseDownPayment || (await factory.purchaseDownPayment.create({ supplier }));
  formPurchaseDownPayment =
  formPurchaseDownPayment ||
    (await factory.form.create({
      branch,
      number: 'PDP2211001',
      formable: purchaseDownPayment,
      formableType: 'PurchaseDownPayment',
      createdBy: maker.id,
      updatedBy: maker.id,
      requestApprovalTo: approver.id,
    }));
  purchaseReturn = purchaseReturn || (await factory.purchaseReturn.create({ supplier }));
  formPurchaseReturn =
  formPurchaseReturn ||
    (await factory.form.create({
      branch,
      number: 'PR2211001',
      formable: purchaseReturn,
      formableType: 'PurchaseReturn',
      createdBy: maker.id,
      updatedBy: maker.id,
      requestApprovalTo: approver.id,
    }));

  paymentOrder = paymentOrder || (await factory.paymentOrder.create({supplier}));
  paymentOrderDetails =
    paymentOrderDetails ||
    (await factory.paymentOrderDetails.create({
      paymentOrder,
      purchaseInvoice,
      purchaseDownPayment,
      purchaseReturn,
      chartOfAccountExpense,
      chartOfAccountIncome,
      allocation,
    }));
  formPaymentOrder =
    formPaymentOrder ||
    (await factory.form.create({
      branch,
      reference: paymentOrder,
      createdBy: maker.id,
      updatedBy: maker.id,
      requestApprovalTo: approver.id,
      formable: paymentOrder,
      formableType: 'PaymentOrder',
      number: 'PPO2211001',
    }));
  return {
    maker,
    approver,
    branch,
    branchUser,
    supplier,
    item,
    itemUnit,
    allocation,
    purchaseInvoice,
    formPurchaseInvoice,
    purchaseDownPayment,
    formPurchaseDownPayment,
    purchaseReturn,
    formPurchaseReturn,
    chartOfAccountExpense,
    chartOfAccountIncome,
    paymentOrder,
    paymentOrderDetails,
    formPaymentOrder
  };
};