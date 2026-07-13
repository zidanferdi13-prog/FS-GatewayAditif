/**
 * Routes Index
 * Main router that combines all route modules
 */

const express = require('express');
const router = express.Router();

const weightRoutes = require('./weightRoutes');
const moRoutes     = require('./moRoutes');

module.exports = (controllers) => {
  const { weightController, moController } = controllers;

  // Mount weight routes
  router.use('/weight', weightRoutes(weightController));

  // Mount MO routes
  router.use('/mo', moRoutes(moController));

  // Backward compatibility route for /api/history
  router.get('/history', (req, res) => weightController.getHistoricalData(req, res));

  return router;
};
