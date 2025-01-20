const { Joi } = require('celebrate');

const getToken = {
  body: Joi.object({
    id: Joi.number().required(),
    email: Joi.string().email().required(),
    accessToken: Joi.string().required(),
  }),
};

module.exports = {
  getToken,
};
