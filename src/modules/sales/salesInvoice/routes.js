const express = require('express');
const { celebrate } = require('celebrate');
const auth = require('@src/modules/auth/services/auth.service');
const requestValidations = require('./requestValidations');
const controller = require('./controller');

const router = express.Router();

// GET ALL SALES INVOICE
router.route('/').get(auth('read sales invoice'), controller.findAll);

// GET ALL FORM REFERENCE
router.route('/form-references').get(auth(), controller.findAllReferenceForm);

// GET REPORT
router.route('/report').get(auth('read sales invoice'), controller.getReport);

// GET ONE SALES INVOICE
router
  .route('/:salesInvoiceId')
  .get(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireSalesInvoiceId),
    auth('read sales invoice'),
    controller.findOne
  );

// REQUEST CREATING SALES INVOICE
router
  .route('/')
  .post(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.createFormRequest),
    auth('create sales invoice'),
    controller.createFormRequest
  );

// APPROVE CREATING SALES INVOICE
router
  .route('/:salesInvoiceId/approve')
  .post(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireSalesInvoiceId),
    auth('approve sales invoice'),
    controller.createFormApprove
  );

// CREATE APPROVE USING EMAIL TOKEN
router
  .route('/create-approve-with-token')
  .post(celebrate(requestValidations.createFormApproveByToken), controller.createFormApproveByToken);

// REJECT CREATING SALES INVOICE
router
  .route('/:salesInvoiceId/reject')
  .post(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireSalesInvoiceId),
    celebrate(requestValidations.createFormReject),
    auth('approve sales invoice'),
    controller.createFormReject
  );

// CREATE REJECT USING EMAIL TOKEN
router
  .route('/create-reject-with-token')
  .post(celebrate(requestValidations.createFormRejectByToken), controller.createFormRejectByToken);

// REQUEST DELETING SALES INVOICE
router
  .route('/:salesInvoiceId')
  .delete(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireSalesInvoiceId),
    celebrate(requestValidations.deleteFormRequest),
    auth('delete sales invoice'),
    controller.deleteFormRequest
  );

// APPROVE DELETING SALES INVOICE
router
  .route('/:salesInvoiceId/cancellation-approve')
  .post(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireSalesInvoiceId),
    auth('approve sales invoice'),
    controller.deleteFormApprove
  );

// DELETE APPROVE USING EMAIL TOKEN
router
  .route('/delete-approve-with-token')
  .post(celebrate(requestValidations.deleteFormApproveByToken), controller.deleteFormApproveByToken);

// REJECT DELETING SALES INVOICE
router
  .route('/:salesInvoiceId/cancellation-reject')
  .post(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireSalesInvoiceId),
    celebrate(requestValidations.deleteFormReject),
    auth('approve sales invoice'),
    controller.deleteFormReject
  );

// DELETE REJECT USING EMAIL TOKEN
router
  .route('/delete-reject-with-token')
  .post(celebrate(requestValidations.deleteFormRejectByToken), controller.deleteFormRejectByToken);

// UPDATE FORM SALES INVOICE
router
  .route('/:salesInvoiceId')
  .patch(
    celebrate(requestValidations.requireAuth),
    celebrate(requestValidations.requireSalesInvoiceId),
    celebrate(requestValidations.updateForm),
    auth('update sales invoice'),
    controller.updateForm
  );

router
  .route('/:salesInvoiceId/send-invoice')
  .post(celebrate(requestValidations.sendInvoice), auth(), controller.sendInvoiceToCustomer);

module.exports = router;
