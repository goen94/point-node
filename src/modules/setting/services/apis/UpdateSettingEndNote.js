class UpdateSettingEndNote {
  constructor(tenantDatabase, { user, updateSettingEndNoteDto }) {
    this.tenantDatabase = tenantDatabase;
    this.user = user;
    this.updateSettingEndNoteDto = updateSettingEndNoteDto;
  }

  async call() {
    let settingEndNote = await this.tenantDatabase.SettingEndNote.findOne();
    if (!settingEndNote) {
      settingEndNote = await this.tenantDatabase.SettingEndNote.create({
        ...this.updateSettingEndNoteDto,
        createdBy: this.user.id,
        updatedBy: this.user.id,
      });

      return { settingEndNote };
    }

    settingEndNote = await settingEndNote.update({
      ...this.updateSettingEndNoteDto,
      updatedBy: this.user.id,
    });

    return { settingEndNote };
  }
}

module.exports = UpdateSettingEndNote;
