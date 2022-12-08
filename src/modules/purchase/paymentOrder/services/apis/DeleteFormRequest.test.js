describe('Payment Order - DeleteFormRequest', () => {
  describe('delete fail', () => {
    let maker, approver, chartOfAccountExpense, allocation, paymentOrder, updateFormDto;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      ({ approver, supplier, allocation, paymentOrder, chartOfAccountExpense } = recordFactories);

      done();
    });

    it('throw error when requested by user with different branch', async () => {
      const maker = await factory.user.create();
      const branch = await factory.branch.create();
      await factory.branchUser.create({ user: maker, branch, isDefault: false });

      const deleteFormRequestDto = {
        reason: 'example reason',
      };

      await expect(async () => {
        await new DeleteFormRequest(tenantDatabase, { maker, paymentOrderId: paymentOrder.id, deleteFormRequestDto }).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'you don\t have permission to delete this form'));
    });

    it('throw error when requested by user that does not have access to delete', async () => {
      const maker = await factory.user.create();
      const role = await Role.create({ name: 'user', guardName: 'api' });
      await ModelHasRole.create({
        roleId: role.id,
        modelId: maker.id,
        modelType: 'App\\Model\\Master\\User',
      });

      const deleteFormRequestDto = {
        reason: 'example reason',
      };
      
      await expect(async () => {
        await new DeleteFormRequest(tenantDatabase, { maker, paymentOrderId: paymentOrder.id, deleteFormRequestDto }).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'you don\'t have permission to delete this form'));
    });

    it('throw error if already referenced in payment', async () => {
      const payment = (await factory.payment.create({ paymentOrder }));
      const paymentDetail = (await factory.paymentDetail.create({ paymentOrder, chartOfAccountExpense }));
      const formPayment =
        (await factory.form.create({
          branch,
          reference: payment,
          createdBy: maker.id,
          updatedBy: maker.id,
          requestApprovalTo: approver.id,
          formable: paymentOrder,
          formableType: 'Payment',
          number: 'CASH/OUT/2211001',
        }));

      const deleteFormRequestDto = {
        reason: 'example reason',
      };

      await expect(async () => {
        await new DeleteFormRequest(tenantDatabase, { maker, paymentOrderId: paymentOrder.id, deleteFormRequestDto }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'can\t delete, form already referenced'));
    });

    it('throw error if reason is empty', async () => {
      const deleteFormRequestDto = {
        reason: null,
      };

      await expect(async () => {
        await new DeleteFormRequest(tenantDatabase, { maker, paymentOrderId: paymentOrder.id, deleteFormRequestDto }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Invalid data'));
    });
  })

  describe('delete success', () => {
    let maker, paymentOrder, formPaymentOrder;
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      ({ approver, paymentOrder, formPaymentOrder } = recordFactories);

      done();
    });

    it('success delete and check data', async () => {
      const deleteFormRequestDto = {
        reason: 'example reason',
      };

      ({ paymentOrderForm } = await new DeleteFormRequest(tenantDatabase, {
        maker, paymentOrderId: paymentOrder.id, deleteFormRequestDto
      }).call());

      expect(paymentOrderForm.number).toEqual(formPaymentOrder.number);
      expect(paymentOrderForm.cancellationStatus).toEqual(0);
      expect(paymentOrderForm.done).toEqual(0);
    })

    it('check if email sent', async () => {
      const emailSpy = jest.spyOn(ProcessSendDeleteApproval)
      const deleteFormRequestDto = {
        reason: 'example reason',
      };
      ({ paymentOrder } = await new DeleteFormRequest(tenantDatabase, {
        maker, paymentOrderId: paymentOrder.id, deleteFormRequestDto
      }).call());
      expect(emailSpy).toHaveBeenCalled()
    })
  })
})

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