const jwt = require('jsonwebtoken');
const moment = require('moment');
const config = require('../../../config/config');

const DEFAULT_EXPIRES = () => moment().add(30, 'minutes');

/**
 * Generate token
 * @param {number} userId
 * @param {moment.Moment} expires
 * @param {string} [secret]
 * @returns {string} Jwt Token
 */
const generateToken = (userId, expires = DEFAULT_EXPIRES(), secret = config.jwt.secret) => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
  };
  return jwt.sign(payload, secret);
};

const generatePayloadToken = (tokenPayload, expires = DEFAULT_EXPIRES(), secret = config.jwt.secret) => {
  const payload = {
    ...tokenPayload,
    iat: moment().unix(),
    exp: expires.unix(),
  };
  return jwt.sign(payload, secret);
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @returns {Promise<Token>} Payload of the token
 */
const verifyToken = async (token, secret = config.jwt.secret) => {
  const payload = jwt.verify(token, secret);
  return payload;
};

module.exports = {
  generateToken,
  generatePayloadToken,
  verifyToken,
};
