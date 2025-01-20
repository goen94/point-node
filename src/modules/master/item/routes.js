const express = require('express');
const { celebrate } = require('celebrate');
const auth = require('@src/modules/auth/services/auth.service');
const requestValidations = require('./requestValidations');
const controller = require('./controller');

const router = express.Router();

// GET ALL ITEMS
router
  .route('/')
  .get(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.findAll),
    auth('read item'),
    controller.findAll
  );

module.exports = router;
