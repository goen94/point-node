const FileType = require('file-type');
const httpStatus = require('http-status');
const ApiError = require('./ApiError');

const DEFAULT_PERMITTED_TYPES = /jpeg|jpg|png/;
const DEFAULT_MAX_TOTAL_FILE = 1;

module.exports = function fileValidator(
  { permittedTypes = DEFAULT_PERMITTED_TYPES, maxTotalFile = DEFAULT_MAX_TOTAL_FILE } = {
    permittedTypes: DEFAULT_PERMITTED_TYPES,
    maxTotalFile: DEFAULT_MAX_TOTAL_FILE,
  }
) {
  return async (req, res, next) => {
    const { file, files } = req;

    try {
      validateMaxTotalFile(files, maxTotalFile);
      await validateSingleFile(file, permittedTypes);
      await validateMultiFile(files, permittedTypes);

      return next();
    } catch (e) {
      return next(e);
    }
  };
};

// private

function validateMaxTotalFile(files, maxTotalFile) {
  if (files) {
    if (files.length > maxTotalFile) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Only can accept ${maxTotalFile} files`);
    }
  }
}

async function getInvalidFileName(file, permittedTypes) {
  const { buffer } = file;
  const fileDetail = await FileType.fromBuffer(buffer);
  const isValid = permittedTypes.test(fileDetail.mime);

  return isValid ? '' : file.originalname;
}

async function validateSingleFile(file, permittedTypes) {
  if (file) {
    const invalidFileName = await getInvalidFileName(file, permittedTypes);

    if (invalidFileName) {
      throw new ApiError(httpStatus.BAD_REQUEST, `File ${invalidFileName} has invalid file type`);
    }
  }
}

async function validateMultiFile(files, permittedTypes) {
  if (files) {
    const checkInvalidFiles = [];
    files.forEach((fileItem) => {
      checkInvalidFiles.push(getInvalidFileName(fileItem, permittedTypes));
    });

    const resultCheckInvalidFiles = await Promise.allSettled(checkInvalidFiles);
    const invalidFiles = [];
    resultCheckInvalidFiles.forEach((invalidFile) => {
      if (invalidFile.value !== '') {
        invalidFiles.push(invalidFile.value);
      }
    });

    if (invalidFiles.length !== 0) {
      const invalidFileNames = invalidFiles.join(', ');

      throw new ApiError(httpStatus.BAD_REQUEST, `File(s) [${invalidFileNames}] has/have invalid file type`);
    }
  }
}
