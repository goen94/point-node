const getCurrentTenantDatabase = require('./getCurrentTenantDatabase');

describe('getCurrentTenantDatabase', () => {
  it('throws error when tenant name params not provided', async () => {
    await expect(async () => {
      await getCurrentTenantDatabase();
    }).rejects.toThrow('Tenant name is required');
  });

  it('throws error when project is not exist', async () => {
    await expect(async () => {
      await getCurrentTenantDatabase('inexist_project');
    }).rejects.toThrow('Tenant project is not exist');
  });
});
