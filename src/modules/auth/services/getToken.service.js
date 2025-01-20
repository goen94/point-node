/**
 * This service has responsibility to validate token to main app and
 * then generate new token which will be used for this application
 */

const axios = require('axios');
const httpStatus = require('http-status');
const config = require('@src/config/config');
const ApiError = require('@src/utils/ApiError');
const token = require('./token.service');

async function getToken(generateTokenDto) {
  const { id, email, accessToken } = generateTokenDto;

  const userData = await getUserDataFromMainServer(accessToken);

  if (userData.id === id && userData.email === email) {
    const jwtoken = token.generateToken(userData.id);

    return jwtoken;
  }

  throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
}

async function getUserDataFromMainServer(accessToken) {
  const requestUrl = `${config.mainPointUrl}/api/v1/auth/fetch`;
  const requestHeaders = { Authorization: `Bearer ${accessToken}` };
  const requestBody = { access_token: accessToken };
  console.log(accessToken)
  try {
    const {
      data: { data },
    } = await axios.post(requestUrl, requestBody, {
      headers: requestHeaders,
    });

    return data;
  } catch (e) {
    if (e?.response?.status === 401) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
    } else {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
  }
}

module.exports = getToken;
