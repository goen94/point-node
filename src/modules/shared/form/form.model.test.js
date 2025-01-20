const { Form } = require('@src/models').tenant;

describe('Form Model', () => {
  describe('#getFormable', () => {
    it('returns null if formableType is null', async () => {
      const form = Form.build();
      const formable = await form.getFormable();
      expect(formable).toBeNull();
    });
  });
});
