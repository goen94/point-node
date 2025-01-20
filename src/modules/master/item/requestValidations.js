const { Joi } = require('celebrate');

const requireAuth = {
  headers: Joi.object({
    authorization: Joi.string().required(),
  }).unknown(true),
};

const findAll = {
  params: Joi.object({
    warehouse_id: Joi.number().optional(),
    filter_like: Joi.object({
      code: Joi.string().optional(),
      name: Joi.string().optional(),
    }).optional(),
  }),
};

module.exports = {
  requireAuth,
  findAll,
};
