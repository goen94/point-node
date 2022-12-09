const { tenantDatabase } = require('@src/models').tenant;
const ProcessSendCreateApproval = require('../../workers/ProcessSendCreateApproval.worker');
const CreateFormRequest = require('./CreateFormRequest');

jest.mock('../../workers/ProcessSendCreateApproval.worker');
const mockedTime = new Date(Date.UTC(2022, 11, 1)).valueOf();
Date.now = jest.fn(() => new Date(mockedTime));

describe('Payment Order - CreateFormRequest', () => {
  describe('create fail', () => {
    let maker, purchaseInvoice, purchaseDownPayment, purchaseReturn, chartOfAccountExpense, chartOfAccountIncome, approver, supplier, allocation, createFormRequestDto
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      ({ purchaseInvoice, purchaseDownPayment, purchaseReturn, chartOfAccountExpense, chartOfAccountIncome, approver, supplier, allocation } = recordFactories);
      createFormRequestDto = generateCreateFormRequestDto({
        purchaseInvoice,
        purchaseDownPayment,
        purchaseReturn,
        chartOfAccountExpense,
        chartOfAccountIncome,
        maker,
        approver,
        supplier,
        allocation,
      });

      done();
    });

    it('can\'t create when requested by user that does not have branch default', async () => {
      const maker = await factory.user.create();
      const branch = await factory.branch.create();
      await factory.branchUser.create({ user: maker, branch, isDefault: false });

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, { maker, createFormRequestDto }).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'please set default branch to create this form'));
    });

    it('can\'t create when requested by user that does not have access to create', async () => {
      const maker = await factory.user.create();
      const role = await Role.create({ name: 'user', guardName: 'api' });
      await ModelHasRole.create({
        roleId: role.id,
        modelId: maker.id,
        modelType: 'App\\Model\\Master\\User',
      });
      createFormRequestDto.createdBy = maker.id;

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, { maker, createFormRequestDto }).call();
      }).rejects.toThrow(new ApiError(httpStatus.FORBIDDEN, 'you don\'t have permission to create this form'));
    });

    it('can\t create if required data is empty', async () => {
      createFormRequestDto.paymentType = null;
      createFormRequestDto.supplierId = null;

      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Invalid data'));
    });

    describe('throw error if reference invalid', () => {
      beforeEach(async (done) => {
        const recordFactories = await generateRecordFactories();
        ({ purchaseInvoice, purchaseDownPayment, purchaseReturn, chartOfAccountExpense, chartOfAccountIncome, approver, supplier, allocation } = recordFactories);
        createFormRequestDto = generateCreateFormRequestDto({
          purchaseInvoice,
          purchaseDownPayment,
          purchaseReturn,
          chartOfAccountExpense,
          chartOfAccountIncome,
          maker,
          approver,
          supplier,
          allocation,
        });
  
        done();
      });

      it('throw error if purchase invoice not exist', async () => {
        createFormRequestDto.invoices[0].id = 200
        await expect(async () => {
          await new CreateFormRequest(tenantDatabase, {
            maker,
            createFormRequestDto,
          }).call();
        }).rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'purchase invoice not exist'));
      })

      it('throw error if purchase downpayment not exist', async () => {
        createFormRequestDto.downPayments[0].id = 200
        await expect(async () => {
          await new CreateFormRequest(tenantDatabase, {
            maker,
            createFormRequestDto,
          }).call();
        }).rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'purchase down payment not exist'));
      })

      it('throw error if purchase return not exist', async () => {
        createFormRequestDto.returns[0].id = 200
        await expect(async () => {
          await new CreateFormRequest(tenantDatabase, {
            maker,
            createFormRequestDto,
          }).call();
        }).rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'purchase return not exist'));
      })
    })

    it('throw error if supplier not exist', async () => {
      createFormRequestDto.supplierId = 200
      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.NOT_FOUND, 'supplier not exist'));
    })

    it('throw error if reference invalid for supplier', async () => {
      await purchaseInvoice.update({
        supplierId: 10,
      }); 
      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, `invalid supplier for form ${purchaseInvoice.form.number}`));
    })

    describe('throw error if amount order more than amount available in reference', () => {
      beforeEach(async (done) => {
        const recordFactories = await generateRecordFactories();
        ({ purchaseInvoice, purchaseDownPayment, purchaseReturn, chartOfAccountExpense, chartOfAccountIncome, approver, supplier, allocation } = recordFactories);
        createFormRequestDto = generateCreateFormRequestDto({
          purchaseInvoice,
          purchaseDownPayment,
          purchaseReturn,
          chartOfAccountExpense,
          chartOfAccountIncome,
          maker,
          approver,
          supplier,
          allocation,
        });
  
        done();
      });

      it('throw error on purchase invoice', async () => {
        createFormRequestDto.invoices[0].amount = 500000
        const form = await tenantDatabase.Form.findOne({
          where: {
            formableId: createFormRequestDto.invoices[0].id,
            formableType: 'PurchaseInvoice',
          }
        });
        await expect(async () => {
          await new CreateFormRequest(tenantDatabase, {
            maker,
            createFormRequestDto,
          }).call();
        }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, `form ${form.number} amount exceed available`));
      })

      it('throw error on purchase invoice', async () => {
        createFormRequestDto.downPayments[0].amount = 500000
        const form = await tenantDatabase.Form.findOne({
          where: {
            formableId: createFormRequestDto.downPayments[0].id,
            formableType: 'PurchaseDownPayment',
          }
        });
        await expect(async () => {
          await new CreateFormRequest(tenantDatabase, {
            maker,
            createFormRequestDto,
          }).call();
        }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, `form ${form.number} amount exceed available`));
      })

      it('throw error on purchase return', async () => {
        createFormRequestDto.returns[0].amount = 500000
        const form = await tenantDatabase.Form.findOne({
          where: {
            formableId: createFormRequestDto.returns[0].id,
            formableType: 'PurchaseReturn',
          }
        });
        await expect(async () => {
          await new CreateFormRequest(tenantDatabase, {
            maker,
            createFormRequestDto,
          }).call();
        }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, `form ${form.number} amount exceed available`));
      })
    })

    it('throw error if notes more than 255 character', async () => {
      createFormRequestDto.notes = faker.datatype.string(300)
      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'notes can\'t more than 255 character'));
    })

    it('throw error if notes have space at start or end', async () => {
      createFormRequestDto.notes = ' example notes '
      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'notes can\'t have space at start or end'));
    })

    it('throw error if total invoice incorrect', async () => {
      createFormRequestDto.totalInvoiceAmount = 400000
      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'incorect total invoice amount'));
    })

    it('throw error if total down payment incorrect', async () => {
      createFormRequestDto.totalDownPaymentAmount = 400000
      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'incorect total down payment amount'));
    })

    it('throw error if total return incorrect', async () => {
      createFormRequestDto.totalReturnAmount = 400000
      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'incorect total return amount'));
    })

    it('throw error if total other incorrect', async () => {
      createFormRequestDto.totalOtherAmount = 400000
      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'incorect total other amount'));
    })

    it('throw error if total return more than total invoice', async () => {
      createFormRequestDto.invoices[0].amount = 10000
      createFormRequestDto.totalInvoiceAmount = createFormRequestDto.invoices[0].amount
      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'total return can\'t more than total invoice'));
    })

    it('throw error if total down payment more than total invoice', async () => {
      createFormRequestDto.invoices[0].amount = 30000
      createFormRequestDto.totalInvoiceAmount = createFormRequestDto.invoices[0].amount
      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'total down payment can\'t more than total invoice'));
    })

    it('throw error if total amount incorrect', async () => {
      createFormRequestDto.totalAmount = 3000000
      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'incorect total amount'));
    })

    it('throw error when setting journal is missing', async () => {
      await settingJournal.destroy();
      await expect(async () => {
        await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call();
      }).rejects.toThrow(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Journal purchase account - account payable not found'));
    });

    it('throw error if form number already in database', async () => {
      ({ paymentOrder, paymentOrderForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());
      await expect(async () => {
        await factory.form.create({
          branch,
          number: paymentOrderForm.number,
          formable: paymentOrder,
          formableType: 'PaymentOrder',
          createdBy: maker.id,
          updatedBy: maker.id,
          requestApprovalTo: approver.id,
        });
      }).rejects.toThrow();
    });
  })

  describe('create success', () => {
    let maker, purchaseInvoice, purchaseDownPayment, purchaseReturn, chartOfAccountExpense, chartOfAccountIncome, approver, supplier, allocation, createFormRequestDto
    beforeEach(async (done) => {
      const recordFactories = await generateRecordFactories();
      ({ purchaseInvoice, purchaseDownPayment, purchaseReturn, chartOfAccountExpense, chartOfAccountIncome, approver, supplier, allocation } = recordFactories);
      createFormRequestDto = generateCreateFormRequestDto({
        purchaseInvoice,
        purchaseDownPayment,
        purchaseReturn,
        chartOfAccountExpense,
        chartOfAccountIncome,
        maker,
        approver,
        supplier,
        allocation,
      });

      done();
    });

    it('check saved data same with data sent', async () => {
      ({ paymentOrder } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());
      expect(paymentOrder.paymentType).toEqual(createFormRequestDto.paymentType);
      expect(paymentOrder.supplierId).toEqual(createFormRequestDto.supplierId);
      expect(paymentOrder.amount).toEqual(createFormRequestDto.totalAmount);
      expect(paymentOrder.invoices[0].id).toEqual(createFormRequestDto.invoices[0].id)
      expect(paymentOrder.invoices[0].amount).toEqual(createFormRequestDto.invoices[0].amount)
      expect(paymentOrder.downPayments[0].id).toEqual(createFormRequestDto.downPayments[0].id)
      expect(paymentOrder.downPayments[0].amount).toEqual(createFormRequestDto.downPayments[0].amount)
      expect(paymentOrder.returns[0].id).toEqual(createFormRequestDto.returns[0].id)
      expect(paymentOrder.returns[0].amount).toEqual(createFormRequestDto.returns[0].amount)
    })

    it('check if email sent', async () => {
      const emailSpy = jest.spyOn(ProcessSendCreateApproval)
      ({ paymentOrder } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());
      expect(emailSpy).toHaveBeenCalled()
    })

    it('check form number and form status', async () => {
      ({ paymentOrderForm } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());
      expect(paymentOrderForm.number).toEqual('PPO2212001')
      expect(paymentOrderForm.approvalStatus).toEqual(0)
      expect(paymentOrderForm.done).toEqual(0)
    })

    it('check journal balance', async () => {
      ({ paymentOrder } = await new CreateFormRequest(tenantDatabase, {
        maker,
        createFormRequestDto,
      }).call());

      const journal = await new CheckJournal(tenantDatabase, {
        paymentOrderId: paymentOrder.id
      });

      expect(journal.valid).toEqual(true);
    })

    describe('check form reference still pending if amount less than available', () => {
      let paymentOrder;
      beforeEach(async (done) => {
        ({ paymentOrder } = await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call());

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

    describe('check form reference done if amount same as available', () => {
      let paymentOrder;
      beforeAll(async () => {
        paymentOrder = (await factory.paymentOrder.create({supplier}));
        paymentOrderDetails =
          (await factory.paymentOrderDetails.createDone({
            paymentOrder,
            purchaseInvoice,
            purchaseDownPayment,
            purchaseReturn,
            chartOfAccountExpense,
            chartOfAccountIncome,
            allocation,
          }));
        formPaymentOrder =
          (await factory.form.create({
            branch,
            reference: paymentOrder,
            createdBy: maker.id,
            updatedBy: maker.id,
            requestApprovalTo: approver.id,
            formable: paymentOrder,
            formableType: 'PaymentOrder',
            number: 'PAYORDER2211002',
          }));
        const recordFactories = await generateRecordFactories();
        ({ paymentOrder, approver, formPaymentOrder} = recordFactories);

        ({ paymentOrder } = await new CreateFormRequest(tenantDatabase, {
          maker,
          createFormRequestDto,
        }).call());

        done();
      })

      it('check form invoice', async () => {
        const form = await tenantDatabase.Form.findOne({
          where: {
            formableId: paymentOrder.invoices[0].id,
            formableType: 'PurchaseInvoice',
          }
        })
        expect(form.done).toEqual(1)
      })

      it('check form down payment', async () => {
        const form = await tenantDatabase.Form.findOne({
          where: {
            formableId: paymentOrder.downPayments[0].id,
            formableType: 'PurchaseDownPayment',
          }
        })
        expect(form.done).toEqual(1)
      })

      it('check form return', async () => {
        const form = await tenantDatabase.Form.findOne({
          where: {
            formableId: paymentOrder.returns[0].id,
            formableType: 'PurchaseReturn',
          }
        })
        expect(form.done).toEqual(1)
      })
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
  };
};

const generateCreateFormRequestDto = ({
  purchaseInvoice,
  purchaseDownPayment,
  purchaseReturn,
  chartOfAccountExpense,
  chartOfAccountIncome,
  maker,
  approver,
  supplier,
  allocation,
}) => ({
  paymentType: 'cash',
  supplierId: supplier.id || 1,
  supplierName: supplier.name || 'Supplier',
  date: '2022-12-03',
  invoices: [{
    id: purchaseInvoice.id,
    amount: 100000
  }],
  downPayments: [{
    id: purchaseDownPayment.id,
    amount: 50000
  }],
  returns: [{
    id: purchaseReturn.id,
    amount: 20000
  }],
  others: [
    {
      coaId: chartOfAccountExpense.id,
      notes: 'example notes',
      amount: 5000,
      allocationId: allocation.id,
    },
    {
      coaId: chartOfAccountIncome.id,
      notes: 'example notes',
      amount: 10000,
      allocationId: allocation.id,
    },
  ],
  createdBy: maker.id,
  requestApprovalTo: approver.id,
  totalInvoiceAmount: 100000,
  totalDownPaymentAmount: 50000,
  totalReturnAmount: 20000,
  totalOtherAmount: 5000,
  totalAmount: 35000,
  notes: 'example form note',
});