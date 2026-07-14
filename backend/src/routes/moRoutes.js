'use strict';

/**
 * MO Routes
 */

const express = require('express');
const router = express.Router();

module.exports = (moController) => {
  // GET /api/mo — list all MOs
  router.get('/', (req, res, next) => moController.list(req, res, next));

  // POST /api/mo/reprint — reprint (must be before /:nomor_mo params)
  router.post('/reprint', (req, res, next) => moController.reprint(req, res, next));

  // POST /api/mo/reprint-lot — reprint whole lot
  router.post('/reprint-lot', (req, res, next) => moController.reprintLot(req, res, next));

  // GET /api/mo/:nomor_mo — detail with RM + weight records
  router.get('/:nomor_mo', (req, res, next) => moController.detail(req, res, next));

  return router;
};
