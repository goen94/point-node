const express = require('express');
const { celebrate } = require('celebrate');
const auth = require('@src/modules/auth/services/auth.service');
const requestValidations = require('./requestValidations');
const controller = require('./controller');

const router = express.Router();

// GET ALL REFERENCE FORM BY SUPPLIER
router.route('/references/:supplierId').get(auth('read purchase payment order'), controller.findAllReferenceForm);

router
  .route('/')
  .get(
    celebrate(requestValidations.requireAuth),
    auth('read purchase payment order'),
    controller.findAll
  );

router
  .route('/:id')
  .get(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireId),
    auth('read purchase payment order'),
    controller.findOne
  );

// REQUEST CREATING PURCHASE PAYMENT ORDER
router
  .route('/')
  .post(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.createFormRequest),
    auth('create purchase payment order'),
    controller.createFormRequest
  );

router
  .route('/:id')
  .patch(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireId),
    celebrate(requestValidations.updateFormRequest),
    auth('update purchase payment order'),
    controller.updateFormRequest
  );

router
  .route('/:id')
  .delete(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireId),
    celebrate(requestValidations.deleteFormRequest),
    auth('delete purchase payment order'),
    controller.deleteFormRequest
  );

router
  .route('/:id/approve')
  .post(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireId),
    auth('approve purchase payment order'),
    controller.createFormApprove
  );

router
  .route('/:id/reject')
  .post(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireId),
    celebrate(requestValidations.createFormReject),
    auth('approve purchase payment order'),
    controller.createFormReject
  );

router
  .route('/:id/cancellation-approve')
  .post(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireId),
    auth('approve purchase payment order'),
    controller.deleteFormApprove
  );

router
  .route('/:id/cancellation-reject')
  .post(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireId),
    celebrate(requestValidations.deleteFormReject),
    auth('approve purchase payment order'),
    controller.deleteFormReject
  );

router.route('/send').get(auth('read sales invoice'), controller.sendEmail);

module.exports = router;
