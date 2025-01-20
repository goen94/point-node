const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes, projectCode) => {
  class Form extends Model {
    static associate({ [projectCode]: models }) {
      this.belongsTo(models.User, { as: 'createdByUser', foreignKey: 'createdBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'updatedByUser', foreignKey: 'updatedBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'requestApprovalToUser', foreignKey: 'requestApprovalTo', onDelete: 'RESTRICT' });

      this.belongsTo(models.User, { as: 'approvalByUser', foreignKey: 'approvalBy', onDelete: 'RESTRICT' });

      this.belongsTo(models.User, {
        as: 'requestCancellationToUser',
        foreignKey: 'requestCancellationTo',
        onDelete: 'RESTRICT',
      });

      this.belongsTo(models.User, {
        as: 'requestCancellationByUser',
        foreignKey: 'requestCancellationBy',
        onDelete: 'RESTRICT',
      });

      this.belongsTo(models.Branch, { onDelete: 'RESTRICT' });

      this.belongsTo(models.SalesInvoice, { as: 'salesInvoice', foreignKey: 'formableId', constraints: false });

      this.belongsTo(models.DeliveryNote, { as: 'salesDeliveryNote', foreignKey: 'formableId', constraints: false });

      this.belongsTo(models.SalesOrder, { as: 'salesOrder', foreignKey: 'formableId', constraints: false });

      this.belongsTo(models.StockCorrection, { as: 'stockCorrection', foreignKey: 'formableId', constraints: false });

      this.belongsTo(models.InventoryAudit, { as: 'inventoryAudit', foreignKey: 'formableId', constraints: false });

      this.hasOne(models.SalesVisitation, { as: 'salesVisitation', foreignKey: 'formId' });
    }

    getFormable(options) {
      if (!this.formableType) return Promise.resolve(null);
      const mixinMethodName = `get${this.formableType}`;
      return this[mixinMethodName](options);
    }
  }
  Form.init(
    {
      branchId: {
        type: DataTypes.INTEGER,
      },
      date: {
        type: DataTypes.DATE,
      },
      number: {
        type: DataTypes.STRING,
      },
      editedNumber: {
        type: DataTypes.STRING,
      },
      notes: {
        type: DataTypes.TEXT,
      },
      editedNotes: {
        type: DataTypes.TEXT,
      },
      createdBy: {
        type: DataTypes.INTEGER,
      },
      updatedBy: {
        type: DataTypes.INTEGER,
      },
      done: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      // "increment" is already used by sequelize
      incrementNumber: {
        type: DataTypes.INTEGER,
        field: 'increment',
      },
      incrementGroup: {
        type: DataTypes.MEDIUMINT,
      },
      formableId: {
        type: DataTypes.INTEGER,
      },
      formableType: {
        type: DataTypes.STRING,
      },
      requestApprovalTo: {
        type: DataTypes.INTEGER,
      },
      approvalBy: {
        type: DataTypes.INTEGER,
      },
      approvalAt: {
        type: DataTypes.DATE,
      },
      approvalReason: {
        type: DataTypes.TEXT,
      },
      // 0 = pending
      // 1 = approved
      // -1 = rejected
      approvalStatus: {
        type: DataTypes.TINYINT,
        defaultValue: 0,
      },
      requestCancellationTo: {
        type: DataTypes.INTEGER,
      },
      requestCancellationBy: {
        type: DataTypes.INTEGER,
      },
      requestCancellationAt: {
        type: DataTypes.DATE,
      },
      requestCancellationReason: {
        type: DataTypes.TEXT,
      },
      cancellationApprovalAt: {
        type: DataTypes.DATE,
      },
      cancellationApprovalBy: {
        type: DataTypes.INTEGER,
      },
      cancellationApprovalReason: {
        type: DataTypes.TEXT,
      },
      // 0 = pending
      // 1 = approved
      // -1 = rejected
      cancellationStatus: {
        type: DataTypes.TINYINT,
      },
    },
    {
      hooks: {},
      sequelize,
      modelName: 'Form',
      tableName: 'forms',
      underscored: true,
    }
  );
  return Form;
};
