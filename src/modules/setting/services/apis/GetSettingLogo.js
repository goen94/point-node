class GetCurrentLogo {
  constructor(tenantDatabase) {
    this.tenantDatabase = tenantDatabase;
  }

  async call() {
    const settingLogo = await this.tenantDatabase.SettingLogo.findOne();

    return { settingLogo };
  }
}

module.exports = GetCurrentLogo;
