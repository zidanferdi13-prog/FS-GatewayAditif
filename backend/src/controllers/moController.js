'use strict';

/**
 * MO Controller
 * HTTP handlers for MO listing, detail, and reprint.
 */

const moService = require('../services/moService');

class MOController {
  /** GET /api/mo — list all MOs */
  async list(req, res, next) {
    try {
      const list = await moService.listMOs();
      res.json({ success: true, count: list.length, data: list });
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/mo/:nomor_mo — detail with RM + weight records */
  async detail(req, res, next) {
    try {
      const mo = await moService.getMODetail(req.params.nomor_mo);
      if (!mo) {
        return res.status(404).json({ success: false, message: 'MO tidak ditemukan' });
      }
      res.json({ success: true, data: mo });
    } catch (err) {
      next(err);
    }
  }

  /** POST /api/mo/reprint — re-trigger print for a weight record */
  async reprint(req, res, next) {
    try {
      const { mo, lot, rm_index, rm_name, scale_used, weight, target } = req.body;
      if (!mo || rm_index === undefined) {
        return res.status(400).json({ success: false, message: 'Data reprint tidak lengkap' });
      }
      await moService.reprintRM({ mo, lot, rm_index, rm_name, scale_used, weight, target });
      res.json({ success: true, message: 'Print ulang dikirim' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = MOController;
