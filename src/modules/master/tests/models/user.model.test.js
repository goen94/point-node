const { User, Permission, RoleHasPermission, ModelHasRole, Role } = require('../../../../models').tenant;

describe('User Model', () => {
  describe('#create', () => {
    it('create user with valid attributes', async () => {
      const user = await User.create({
        email: 'john.doe@mail.com',
        name: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        address: 'Jakarta',
        phone: '085209090909',
      });
      expect(user.email).toEqual('john.doe@mail.com');
      expect(user.name).toEqual('John Doe');
    });
  });

  describe('instance#isPermitted', () => {
    it('return true if user permitted', async () => {
      const user = await User.create({
        email: 'john.doe@mail.com',
        name: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        address: 'Jakarta',
        phone: '085209090909',
      });
      const role = await Role.create({
        name: 'super_admin',
        guardName: 'api',
      });
      await ModelHasRole.create({
        roleId: role.id,
        modelType: 'App\\Model\\Master\\User',
        modelId: user.id,
      });
      const [createUserPermission, updateUserPermission, deleteUserPermission] = await Promise.all([
        Permission.create({
          name: 'create user',
          guardName: 'api',
        }),
        Permission.create({
          name: 'update user',
          guardName: 'api',
        }),
        Permission.create({
          name: 'delete user',
          guardName: 'api',
        }),
      ]);
      await Promise.all([
        RoleHasPermission.create({
          permissionId: createUserPermission.id,
          roleId: role.id,
        }),
        RoleHasPermission.create({
          permissionId: updateUserPermission.id,
          roleId: role.id,
        }),
        RoleHasPermission.create({
          permissionId: deleteUserPermission.id,
          roleId: role.id,
        }),
      ]);
      const isPermitted = await user.isPermitted(['create user', 'update user', 'delete user']);
      expect(isPermitted).toBeTruthy();
    });

    it('return false if user not permitted', async () => {
      const user = await User.create({
        email: 'john.doe@mail.com',
        name: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        address: 'Jakarta',
        phone: '085209090909',
      });
      const role = await Role.create({
        name: 'super_admin',
        guardName: 'api',
      });
      await ModelHasRole.create({
        roleId: role.id,
        modelType: 'App\\Model\\Master\\User',
        modelId: user.id,
      });
      const isPermitted = await user.isPermitted(['create user', 'update user']);
      expect(isPermitted).toBeFalsy();
    });

    it('return false if user not have role', async () => {
      const user = await User.create({
        email: 'john.doe@mail.com',
        name: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        address: 'Jakarta',
        phone: '085209090909',
      });
      const isPermitted = await user.isPermitted(['create user', 'update user']);
      expect(isPermitted).toBeFalsy();
    });
  });
});
