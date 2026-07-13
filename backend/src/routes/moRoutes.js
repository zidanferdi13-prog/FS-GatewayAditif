'use strict';

/**
 * MO Routes
 */

const express = require('express');
const router = express.Router();

module.exports = (moController) => {
  // GET /api/mo — list all MOs
  router.get('/', (req, res, next) => moController.list(req, res, next));

  // GET /api/mo/:nomor_mo — detail
  router.get('/:nomor_mo', (req, res, next) => moController.detail(req, res, next));

  // POST /api/mo/reprint — reprint
  router.post('/reprint', (req, res, next) => moController.reprint(req, res, next));

  return router;
};
