const ApiError = require('./ApiError');

describe('Api Error', () => {
  it('returns correct api error', () => {
    const apiError = new ApiError(500, 'Internal Server Error', null, true, 'error stack');
    expect(apiError.stack).toEqual('error stack');
  });
});
