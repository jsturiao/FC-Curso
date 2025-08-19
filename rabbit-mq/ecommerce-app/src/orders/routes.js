const express = require('express');
const logger = require('../shared/utils/logger');

const router = express.Router();

// Middleware for logging requests
router.use((req, res, next) => {
  logger.info(`Orders module: ${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    params: req.params
  });
  next();
});

// Delegate all routes to legacy order module for now
router.use('/', (req, res, next) => {
  logger.info('Orders module delegating to legacy module');
  const legacyOrderRoutes = require('../modules/orders/routes');
  legacyOrderRoutes(req, res, next);
});

module.exports = router;
