const express = require('express');
const { celebrate } = require('celebrate');
const auth = require('@src/modules/auth/services/auth.service');
const requestValidations = require('./requestValidations');
const controller = require('./controller');

const router = express.Router();

// GET ALL STOCK CORRECTION
router.route('/').get(auth('read stock correction'), controller.findAll);

// GET ONE STOCK CORRECTION
router
  .route('/:stockCorrectionId')
  .get(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireStockCorrectionId),
    auth('read stock correction'),
    controller.findOne
  );

// REQUEST CREATING STOCK CORRECTION
router
  .route('/')
  .post(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.createFormRequest),
    auth('create stock correction'),
    controller.createFormRequest
  );

// APPROVE CREATING STOCK CORRECTION
router
  .route('/:stockCorrectionId/approve')
  .post(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireStockCorrectionId),
    auth('approve stock correction'),
    controller.createFormApprove
  );

// CREATE APPROVE USING EMAIL TOKEN
router
  .route('/create-approve-with-token')
  .post(celebrate(requestValidations.createFormApproveByToken), controller.createFormApproveByToken);

// REJECT CREATING STOCK CORRECTION
router
  .route('/:stockCorrectionId/reject')
  .post(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireStockCorrectionId),
    celebrate(requestValidations.createFormReject),
    auth('approve stock correction'),
    controller.createFormReject
  );

// CREATE REJECT USING EMAIL TOKEN
router
  .route('/create-reject-with-token')
  .post(celebrate(requestValidations.createFormRejectByToken), controller.createFormRejectByToken);

// REQUEST DELETING STOCK CORRECTION
router
  .route('/:stockCorrectionId')
  .delete(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireStockCorrectionId),
    celebrate(requestValidations.deleteFormRequest),
    auth('delete stock correction'),
    controller.deleteFormRequest
  );

// APPROVE DELETING STOCK CORRECTION
router
  .route('/:stockCorrectionId/cancellation-approve')
  .post(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireStockCorrectionId),
    auth('approve stock correction'),
    controller.deleteFormApprove
  );

// DELETE APPROVE USING EMAIL TOKEN
router
  .route('/delete-approve-with-token')
  .post(celebrate(requestValidations.deleteFormApproveByToken), controller.deleteFormApproveByToken);

// REJECT DELETING STOCK CORRECTION
router
  .route('/:stockCorrectionId/cancellation-reject')
  .post(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireStockCorrectionId),
    celebrate(requestValidations.deleteFormReject),
    auth('approve stock correction'),
    controller.deleteFormReject
  );

// DELETE REJECT USING EMAIL TOKEN
router
  .route('/delete-reject-with-token')
  .post(celebrate(requestValidations.deleteFormRejectByToken), controller.deleteFormRejectByToken);

// UPDATE FORM STOCK CORRECTION
router
  .route('/:stockCorrectionId')
  .patch(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireStockCorrectionId),
    celebrate(requestValidations.updateForm),
    auth('update stock correction'),
    controller.updateForm
  );

module.exports = router;
