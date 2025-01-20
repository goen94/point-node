const multer = require('multer');
const httpStatus = require('http-status');
const ApiError = require('./ApiError');

async function validateMimeType(file, permittedTypes, cb) {
  const isValidMimeType = permittedTypes.test(file.mimetype);

  if (isValidMimeType) {
    return cb(null, true);
  }
  cb(new ApiError(httpStatus.BAD_REQUEST, 'Only can process jpeg, jpg, png, gif file.'));
}

module.exports = ({ permittedTypes = /jpeg|jpg|png|gif/, options = {} }) => {
  return multer({
    storage: multer.memoryStorage(),
    ...options,
    fileFilter: (req, file, cb) => {
      validateMimeType(file, permittedTypes, cb);
    },
  });
};
