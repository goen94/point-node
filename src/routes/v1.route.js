const express = require('express');
const setupDatabase = require('@src/middlewares/setupDatabase');
const config = require('../config/config');
const authRoute = require('../modules/auth/routes');
const settingRoute = require('../modules/setting/routes');
const masterItemRoute = require('../modules/master/item/routes');
const salesInvoiceRoute = require('../modules/sales/salesInvoice/routes');
const stockCorrectionRoute = require('../modules/inventory/stockCorrection/routes');
const paymentOrderRoute = require('../modules/purchase/paymentOrder/routes');

const router = express.Router();

router.get('/status', (req, res) => {
  res.status(200).send('OK');
});

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/setting',
    route: settingRoute,
  },
  {
    path: '/master/items',
    route: masterItemRoute,
  },
  {
    path: '/sales/invoices',
    route: salesInvoiceRoute,
  },
  {
    path: '/inventory/corrections',
    route: stockCorrectionRoute,
  },
  {
    path: '/purchase/payment-order',
    route: paymentOrderRoute,
  },
];

const devRoutes = [];

defaultRoutes.forEach((route) => {
  router.use(route.path, setupDatabase, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
