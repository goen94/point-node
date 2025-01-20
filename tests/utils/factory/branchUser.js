const { BranchUser } = require('@src/models').tenant;

async function create({ user, branch, isDefault = false }) {
  const branchUser = await BranchUser.create({
    userId: user.id,
    branchId: branch.id,
    isDefault,
  });

  return branchUser;
}

module.exports = { create };
