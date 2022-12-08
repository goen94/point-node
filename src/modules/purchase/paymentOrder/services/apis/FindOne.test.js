describe('Payment Order - FindOne', () => {
  describe('read fail', () => {
    it('throw when requested by user that does not have branch default ', async () => {
      const user = await factory.user.create();
      const branch = await factory.branch.create();
      await factory.branchUser.create({ user, branch, isDefault: false });

      const recordFactories = await generateRecordFactories({ user, branch, branchUser });
      ({ paymentOrder } = recordFactories);
      await expect(async () => {
        await new FindOne(user, tenantDatabase, paymentOrder.id).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'please set default branch to read this form'));
    })

    it('throw when requested by user that does not have read permission ', async () => {
      const user = await factory.user.create();
      const role = await Role.create({ name: 'user', guardName: 'api' });
      await ModelHasRole.create({
        roleId: role.id,
        modelId: user.id,
        modelType: 'App\\Model\\Master\\User',
      });
      const recordFactories = await generateRecordFactories();
      ({ paymentOrder } = recordFactories);
      await expect(async () => {
        await new FindOne(user, tenantDatabase, paymentOrder.id).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'you don\'t have permission to read this form'));
    })
  })

  describe('read success', () => {
    it('success return data', async () => {
      const recordFactories = await generateRecordFactories();
      ({ paymentOrder } = recordFactories);

      const { paymentOrder } = await new FindOne(tenantDatabase, paymentOrder.id).call();

      expect(paymentOrder).toBeDefined();
      expect(paymentOrder.form.number).toBeDefined();
      expect(paymentOrder.invoices[0].form.number).toBeDefined();
      expect(paymentOrder.invoices[0].amount).toBeDefined();
      expect(paymentOrder.downPayments[0].form.number).toBeDefined();
      expect(paymentOrder.downPayments[0].amount).toBeDefined();
      expect(paymentOrder.returns[0].form.number).toBeDefined();
      expect(paymentOrder.returns[0].amount).toBeDefined();
    })
  })
})

const generateRecordFactories = async ({
  user,
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
  user = user || (await factory.user.create());
  approver = approver || (await factory.user.create());
  branch = branch || (await factory.branch.create());
  // create relation between user and branch for authorization
  branchUser = branchUser || (await factory.branchUser.create({ user: user, branch, isDefault: true }));
  supplier = supplier || (await factory.supplier.create({ branch }));
  // create relation between user and warehouse for authorization
  item = item || (await factory.item.create());
  itemUnit = itemUnit || (await factory.itemUnit.create({ item, createdBy: user.id }));
  allocation = allocation || (await factory.allocation.create({ branch }));
  purchaseInvoice = purchaseInvoice || (await factory.purchaseInvoice.create({ supplier }));
  formPurchaseInvoice =
  formPurchaseInvoice ||
    (await factory.form.create({
      branch,
      number: 'PI2211001',
      formable: purchaseInvoice,
      formableType: 'PurchaseInvoice',
      createdBy: user.id,
      updatedBy: user.id,
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
      createdBy: user.id,
      updatedBy: user.id,
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
      createdBy: user.id,
      updatedBy: user.id,
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
      createdBy: user.id,
      updatedBy: user.id,
      requestApprovalTo: approver.id,
      formable: paymentOrder,
      formableType: 'PaymentOrder',
      number: 'PPO2211001',
    }));
  return {
    user,
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