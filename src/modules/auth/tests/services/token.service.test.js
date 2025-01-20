const moment = require('moment');
const { generateToken, generatePayloadToken, verifyToken } = require('../../services/token.service');

describe('Auth - Token Service', () => {
  describe('#generateToken', () => {
    it('returns token when success generating token', () => {
      const userId = 1;
      const expires = moment().add(5, 'minutes');
      const secret = 'example-secret';
      const token = generateToken(userId, expires, secret);

      expect(token).toBeTruthy();
    });
  });

  describe('#generatePayloadToken', () => {
    it('returns token when success generating token with default expires and default secret', () => {
      const userId = 1;
      const token = generatePayloadToken(userId);

      expect(token).toBeTruthy();
    });
  });

  describe('#verifyToken', () => {
    it('returns correct payload when success verifying token', async () => {
      const userId = 1;
      const expires = moment().add(5, 'minutes');
      const secret = 'example-secret';
      const token = generateToken(userId, expires, secret);
      const payload = await verifyToken(token, secret);

      expect(payload).toBeTruthy();
      expect(payload).toBeInstanceOf(Object);
      expect(payload.sub).toBe(1);
    });

    it('throws error when token is already expired', async () => {
      const userId = 1;
      const expires = moment().subtract(5, 'minutes');
      const secret = 'example-secret';
      const token = generateToken(userId, expires, secret);

      await expect(async () => {
        await verifyToken(token, secret);
      }).rejects.toThrow('jwt expired');
    });

    it('throws error when token is not jwt', async () => {
      const token = 'invalid-token';

      await expect(async () => {
        await verifyToken(token, 'secret-key');
      }).rejects.toThrow('jwt malformed');
    });
  });
});
