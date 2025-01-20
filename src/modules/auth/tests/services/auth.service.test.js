const passport = require('passport');
const httpStatus = require('http-status');
const { User, Permission, Role, ModelHasRole, ModelHasPermission, RoleHasPermission } = require('@src/models').tenant;
const currentTenantDatabase = require('@src/models').tenant;
const ApiError = require('@src/utils/ApiError');
const auth = require('../../services/auth.service');

const errorForbidden = new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
const errorUnauthorized = new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');

describe('Auth - Auth Service', () => {
  let req;
  let res;
  let next;
  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });
  it('calls next with error forbidden when user does not have permissions', async () => {
    const user = await User.create({
      email: 'john.doe@mail.com',
      name: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
    });
    req.params = {
      userId: user.id,
    };
    const payload = {
      sub: user.id,
    };

    req.currentTenantDatabase = currentTenantDatabase;
    passport.authenticate = jest.fn((authType, options, callback) => () => {
      callback(null, payload, null);
    });

    await auth('create user')(req, res, next);
    expect(next).toBeCalledTimes(1);
    expect(next).toBeCalledWith(errorForbidden);
  });

  it('calls next with error unauthorized when user does not exist', async () => {
    const payload = {
      sub: 1,
    };

    req.currentTenantDatabase = currentTenantDatabase;
    passport.authenticate = jest.fn((authType, options, callback) => () => {
      callback(null, payload, null);
    });

    await auth('create user')(req, res, next);
    expect(next).toBeCalledTimes(1);
    expect(next).toBeCalledWith(errorUnauthorized);
  });

  it('calls next with error unauthorized when payload is missing', async () => {
    req.currentTenantDatabase = currentTenantDatabase;
    passport.authenticate = jest.fn((authType, options, callback) => () => {
      callback(null, null, null);
    });

    await auth('create user')(req, res, next);
    expect(next).toBeCalledTimes(1);
    expect(next).toBeCalledWith(errorUnauthorized);
  });

  it('calls next with no error with required rights', async () => {
    const user = await User.create({
      email: 'john.doe@mail.com',
      name: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
    });
    const userRole = await Role.create({ name: 'user', guardName: 'api' });
    await ModelHasRole.create({
      roleId: userRole.id,
      modelId: user.id,
      modelType: 'App\\Model\\Master\\User',
    });
    const createUserPermission = await Permission.create({
      name: 'create user',
      guardName: 'api',
    });
    await RoleHasPermission.create({
      permissionId: createUserPermission.id,
      roleId: userRole.id,
    });

    await ModelHasPermission.create({
      modelId: user.id,
      modelType: 'User',
      permissionId: createUserPermission.id,
    });
    req.params = {
      userId: user.id,
    };
    const payload = {
      sub: user.id,
    };

    req.currentTenantDatabase = currentTenantDatabase;
    passport.authenticate = jest.fn((authType, options, callback) => () => {
      callback(null, payload, null);
    });

    await auth('create user')(req, res, next);
    expect(next).toBeCalledTimes(1);
    expect(next).toBeCalledWith();
  });

  it('calls next with no error without required rights', async () => {
    const user = await User.create({
      email: 'john.doe@mail.com',
      name: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
    });
    req.params = {
      userId: user.id,
    };
    const payload = {
      sub: user.id,
    };

    req.currentTenantDatabase = currentTenantDatabase;
    passport.authenticate = jest.fn((authType, options, callback) => () => {
      callback(null, payload, null);
    });

    await auth()(req, res, next);
    expect(next).toBeCalledTimes(1);
    expect(next).toBeCalledWith();
  });
});
