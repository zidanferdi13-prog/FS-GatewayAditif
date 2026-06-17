/**
 * Routes Index
 * Main router that combines all route modules
 */

const express = require('express');
const router = express.Router();

const weightRoutes = require('./weightRoutes');

module.exports = (controllers) => {
  const { weightController } = controllers;

  // Mount weight routes
  router.use('/weight', weightRoutes(weightController));

  // Backward compatibility route for /api/history
  router.get('/history', (req, res) => weightController.getHistoricalData(req, res));

  return router;
};
