const { JestNockBack } = require('jest-nock-back');

/* eslint-disable */
module.exports = () => {
  JestNockBack({
    defaultMode: 'record',
    jasmine,
    global
  })
}
/* eslint-enable */
