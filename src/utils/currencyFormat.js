const numeral = require('numeral');

module.exports = function (value) {
  return numeral(value).format('0,0.[00]');
};
