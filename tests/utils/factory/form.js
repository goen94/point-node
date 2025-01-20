const { Form } = require('@src/models').tenant;

async function create({
  branch,
  incrementNumber = 1,
  incrementGroup = 202109,
  createdBy,
  updatedBy,
  requestApprovalTo,
  formable,
  formableType,
  date = new Date(),
  number = 'DN2101001',
  approvalStatus = undefined,
  cancellationStatus = undefined,
}) {
  const form = await Form.create({
    branchId: branch.id,
    date,
    number,
    incrementNumber,
    incrementGroup,
    formableId: formable.id,
    formableType,
    createdBy,
    updatedBy,
    requestApprovalTo,
    approvalStatus,
    cancellationStatus,
  });

  return form;
}

module.exports = { create };
