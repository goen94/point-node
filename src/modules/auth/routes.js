const express = require('express');
const { celebrate } = require('celebrate');
const requestValidations = require('./requestValidations');
const controller = require('./controller');

const router = express.Router();

router.route('/get-token').post(celebrate(requestValidations.getToken), controller.getToken);

module.exports = router;
