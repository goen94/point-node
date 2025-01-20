const { Permission, Role, ModelHasRole, RoleHasPermission } = require('@src/models').tenant;

async function create(module, user) {
  const role = await Role.create({ name: 'user', guardName: 'api' });
  await ModelHasRole.create({
    roleId: role.id,
    modelId: user.id,
    modelType: 'App\\Model\\Master\\User',
  });

  await createPermission('create ' + module, role);
  await createPermission('read ' + module, role);
  await createPermission('update ' + module, role);
  await createPermission('delete ' + module, role);
  await createPermission('approve ' + module, role);
}

async function createPermission(name, role) {
  const permission = await Permission.create({
    name: name,
    guardName: 'api',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await RoleHasPermission.create({
      permissionId: permission.id,
      roleId: role.id
  });
}
module.exports = { create };
