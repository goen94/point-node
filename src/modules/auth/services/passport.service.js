/**
 * This service is used as strategy for passport auth
 */
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const config = require('../../../config/config');

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtVerify = async (payload, done) => {
  done(null, payload);
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

module.exports = {
  jwtStrategy,
};
