const httpStatus = require('http-status');
const ApiError = require('@src/utils/ApiError');
const activateNockBack = require('@root/tests/utils/activateNockBack');
const getTokenService = require('../../services/getToken.service');

const unauthorizedError = new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
const internalServerError = new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Internal server error');

activateNockBack();

describe('Auth - Generate Token Service', () => {
  describe('when success', () => {
    it.nock('return new jwt token', async () => {
      const generateTokenDto = {
        id: 2599,
        email: 'bosgagitu@gmail.com',
        accessToken: '[SECRET]',
      };
      const result = await getTokenService(generateTokenDto);
      expect(result.length).not.toEqual(0);
    });
  });

  describe('when failed', () => {
    it.nock('throw error when request with invalid token', async () => {
      const generateTokenDto = {
        id: 2599,
        email: 'bosgagitu@gmail.com',
        accessToken: 'invalid-token',
      };
      await expect(async () => {
        await getTokenService(generateTokenDto);
      }).rejects.toThrow(unauthorizedError);
    });

    it.nock('throw error when email not same with email that receive from main app', async () => {
      const generateTokenDto = {
        id: 2599,
        email: 'invalid-email@gmail.com',
        accessToken: '[SECRET]',
      };
      await expect(async () => {
        await getTokenService(generateTokenDto);
      }).rejects.toThrow(unauthorizedError);
    });

    it.nock('throw internal server error when get unindentified error form main app', async () => {
      const generateTokenDto = {
        id: 2599,
        email: 'bosgagitu@gmail.com',
        accessToken: '[SECRET]',
      };
      await expect(async () => {
        await getTokenService(generateTokenDto);
      }).rejects.toThrow(internalServerError);
    });
  });
});
