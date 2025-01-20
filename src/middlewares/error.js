const { isCelebrateError } = require('celebrate');
const httpStatus = require('http-status');
const logger = require('@src/config/logger');
const config = require('@src/config/config');
const ApiError = require('@src/utils/ApiError');

const errorConverter = (err, req, res, next) => {
  let error = err;

  if (isCelebrateError(err)) {
    const statusCode = 400;
    const errors = getCelebrateErrors(err.details);
    const message = errors;

    error = new ApiError(statusCode, message, false, err.stack);
  }

  let statusCode;
  let message;
  let meta = {};
  if (!(error instanceof ApiError)) {
    statusCode = error.statusCode ? httpStatus.BAD_REQUEST : httpStatus.INTERNAL_SERVER_ERROR;
    message = error.message || httpStatus[statusCode];
    error = new ApiError(statusCode, message, meta, false, err.stack);
  } else {
    statusCode = error.statusCode;
    message = error.message;
    meta = error.meta;
  }

  return res.status(statusCode).json({
    message,
    meta,
  });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  if (config.env === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    ...(config.env === 'development' && { stack: err.stack }),
  };

  logger.error(err);

  res.status(statusCode).send(response);
};

function getCelebrateErrors(err) {
  const errorBody = err.get('body') && err.get('body').details;
  const errorHeaders = err.get('headers') && err.get('headers').details;

  const errorMessages = [];
  if (errorBody) {
    errorBody.forEach((error) => {
      errorMessages.push(error.message);
    });
  }

  if (errorHeaders) {
    errorHeaders.forEach((error) => {
      errorMessages.push(error.message);
    });
  }

  return errorMessages;
}

module.exports = {
  errorConverter,
  errorHandler,
};
