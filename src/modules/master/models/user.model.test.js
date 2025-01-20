const { User } = require('@src/models').tenant;

describe('User Model', () => {
  describe('custom getters', () => {
    it('returns correct fullname', () => {
      const user = User.build({ firstName: 'John', lastName: 'Doe' });
      expect(user.fullName).toEqual('John Doe');
    });
  });
});
