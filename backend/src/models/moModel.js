/**
 * Manufacturing Order Model
 * Handles database operations for MO, RM details, and weight records
 */

const crypto = require('crypto');
const db = require('../config/database');

class MOModel {
  /**
   * Create new Manufacturing Order
   * @param {Object} data - MO data {nomor_mo, qty_plan, lot, total_rm}
   * @returns {Promise} Insert result
   */
  static async create(data) {
    const query = `
      INSERT INTO tbl_m_manufacturing_orders
      (id, t_mo_id, work_center, nomor_mo, nama_produk, schedule_mo, qty_plan, lot, total_rm, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    try {
      const [result] = await db.execute(query, [
        data.id || crypto.randomUUID(),
        data.t_mo_id,
        data.work_center,
        data.nomor_mo,
        data.nama_produk,
        data.schedule_mo,
        data.qty_plan,
        data.lot,
        data.total_rm
      ]);
      return result;
    } catch (error) {
      console.error('❌ Error creating MO:', error.message);
      throw error;
    }
  }

  /**
   * Create RM detail for specific MO
   * @param {Number} moId - MO ID
   * @param {Object} data - RM data {item, qty, target_weight}
   * @returns {Promise} Insert result
   */
  static async createRMDetail(id, data) {
    const query = `
      INSERT INTO tbl_mo_rm_details
      (id, mo_id, item, qty, target_weight, kategori, informasi, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    try {
      const [result] = await db.execute(query, [
        id || crypto.randomUUID(),
        data.mo_id,
        data.item,
        data.qty,
        data.target_weight,
        data.kategori || null,
        data.informasi || null
      ]);
      return result;
    } catch (error) {
      console.error('❌ Error creating RM detail:', error.message);
      throw error;
    }
  }

  /**
   * Create weight record
   * @param {Object} data - Weight data {mo_id, rm_item, actual_weight, timestamp}
   * @returns {Promise} Insert result
   */
  static async createWeightRecord(data) {
    const query = `
      INSERT INTO tbl_weight_records
      (id, rm_detail_id, actual_weight, lot_number, no_lot, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    try {
      const ts = data.timestamp
        ? data.timestamp.replace('T', ' ').replace('Z', '')
        : null;
      const [result] = await db.execute(query, [
        data.id || crypto.randomUUID(),
        data.rm_detail_id,
        data.actual_weight,
        data.lot_number || 1,
        data.no_lot || null,
        ts || new Date().toISOString().replace('T', ' ').replace('Z', '')
      ]);
      return result;
    } catch (error) {
      console.error('❌ Error creating weight record:', error.message);
      throw error;
    }
  }

  /**
   * Get MO by nomor_mo
   * @param {String} nomorMO - MO number
   * @returns {Promise} MO data with RM details
   */
  static async getByNomorMO(nomorMO) {
    const query = `
      SELECT mo.*,
             JSON_ARRAYAGG(
               JSON_OBJECT(
                 'id', rm.id,
                 'item', rm.item,
                 'qty', rm.qty,
                 'target_weight', rm.target_weight,
                 'kategori', rm.kategori,
                 'informasi', rm.informasi
               )
             ) as rm_details
      FROM tbl_m_manufacturing_orders mo
      LEFT JOIN tbl_mo_rm_details rm ON mo.id = rm.mo_id
      WHERE mo.nomor_mo = ?
      GROUP BY mo.id
    `;
    try {
      const [rows] = await db.execute(query, [nomorMO]);
      if (!rows[0]) return null;
      // mysql2 returns JSON columns as strings — parse and clean nulls from LEFT JOIN
      if (typeof rows[0].rm_details === 'string') {
        const parsed = JSON.parse(rows[0].rm_details);
        rows[0].rm_details = Array.isArray(parsed) ? parsed.filter(d => d.id !== null) : [];
      }
      return rows[0];
    } catch (error) {
      console.error('❌ Error getting MO:', error.message);
      throw error;
    }
  }

  /**
   * List all MOs ordered by newest first
   * @returns {Promise<Array>}
   */
  static async getAll() {
    const query = `
      SELECT id, nomor_mo, nama_produk, qty_plan, total_rm, status,
             lot, work_center, schedule_mo, created_at, last_updated_at
      FROM tbl_m_manufacturing_orders
      ORDER BY created_at DESC
      LIMIT 200
    `;
    try {
      const [rows] = await db.execute(query);
      return rows;
    } catch (error) {
      console.error('❌ Error listing MOs:', error.message);
      throw error;
    }
  }

  /**
   * Get weight records for each RM detail of a given MO
   * @param {String} moId - MO UUID
   * @returns {Promise<Array>} Weight records with rm_detail_id
   */
  static async getWeightRecordsForMO(moId) {
    const query = `
      SELECT wr.id, wr.rm_detail_id, wr.actual_weight, wr.lot_number, wr.no_lot, wr.timestamp
      FROM tbl_weight_records wr
      JOIN tbl_mo_rm_details rm ON wr.rm_detail_id = rm.id
      WHERE rm.mo_id = ?
      ORDER BY wr.timestamp DESC
    `;
    try {
      const [rows] = await db.execute(query, [moId]);
      return rows;
    } catch (error) {
      console.error('❌ Error getting weight records for MO:', error.message);
      throw error;
    }
  }

  /**
   * Get weight records for MO ordered ASC (for lot-based slicing)
   */
  static async getWeightRecordsForMOAsc(moId) {
    const query = `
      SELECT wr.id, wr.rm_detail_id, wr.actual_weight, wr.lot_number, wr.no_lot, wr.timestamp
      FROM tbl_weight_records wr
      JOIN tbl_mo_rm_details rm ON wr.rm_detail_id = rm.id
      WHERE rm.mo_id = ?
      ORDER BY wr.timestamp ASC
    `;
    try {
      const [rows] = await db.execute(query, [moId]);
      return rows;
    } catch (error) {
      console.error('❌ Error getting weight records ASC:', error.message);
      throw error;
    }
  }

  /**
   * Get the highest lot_number for a given MO — used for resume.
   * Returns 0 when no records exist.
   * @param {String} moId - MO UUID
   * @returns {Promise<number>}
   */
  static async getMaxLotNumber(moId) {
    const query = `
      SELECT MAX(wr.lot_number) AS max_lot
      FROM tbl_weight_records wr
      JOIN tbl_mo_rm_details rm ON wr.rm_detail_id = rm.id
      WHERE rm.mo_id = ?
    `;
    try {
      const [rows] = await db.execute(query, [moId]);
      return rows[0]?.max_lot ?? 0;
    } catch (error) {
      console.error('❌ Error getting max lot number:', error.message);
      throw error;
    }
  }

  /**
   * Get weight records for a specific lot within an MO, ordered by timestamp ASC.
   * @param {String} moId - MO UUID
   * @param {number} lotNumber - 1-based lot number
   * @returns {Promise<Array>}
   */
  static async getWeightRecordsByLot(moId, lotNumber) {
    const query = `
      SELECT wr.id, wr.rm_detail_id, wr.actual_weight, wr.lot_number, wr.no_lot, wr.timestamp
      FROM tbl_weight_records wr
      JOIN tbl_mo_rm_details rm ON wr.rm_detail_id = rm.id
      WHERE rm.mo_id = ? AND wr.lot_number = ?
      ORDER BY wr.timestamp ASC
    `;
    try {
      const [rows] = await db.execute(query, [moId, lotNumber]);
      return rows;
    } catch (error) {
      console.error('❌ Error getting weight records by lot:', error.message);
      throw error;
    }
  }

  /**
   * Get RM details for a MO ordered by creation (matches frontend RM index)
   * @param {String} moId - MO UUID
   * @returns {Promise<Array>}
   */
  static async getRMDetailsByMO(moId) {
    const query = `
      SELECT * FROM tbl_mo_rm_details
      WHERE mo_id = ?
      ORDER BY created_at ASC
    `;
    try {
      const [rows] = await db.execute(query, [moId]);
      return rows;
    } catch (error) {
      console.error('❌ Error getting RM details:', error.message);
      throw error;
    }
  }

  /**
   * Get weight records for specific MO via FK chain
   * tbl_m_manufacturing_orders → tbl_mo_rm_details → tbl_weight_records
   * @param {String} moId - MO UUID
   * @returns {Promise} Array of weight records
   */
  static async getWeightRecords(moId) {
    const query = `
      SELECT wr.*
      FROM tbl_weight_records wr
      JOIN tbl_mo_rm_details rm ON wr.rm_detail_id = rm.id
      WHERE rm.mo_id = ?
      ORDER BY wr.timestamp DESC
    `;
    try {
      const [rows] = await db.execute(query, [moId]);
      return rows;
    } catch (error) {
      console.error('❌ Error getting weight records:', error.message);
      throw error;
    }
  }

  /**
   * Update MO status
   * @param {Number} moId - MO ID
   * @param {String} status - New status
   * @returns {Promise} Update result
   */
  static async updateStatus(moId, status) {
    const query = `
      UPDATE tbl_m_manufacturing_orders
      SET status = ?, last_updated_at = NOW()
      WHERE id = ?
    `;
    try {
      const [result] = await db.execute(query, [status, moId]);
      return result;
    } catch (error) {
      console.error('❌ Error updating MO status:', error.message);
      throw error;
    }
  }
  
  /**
   * Mark MO as completed
   * @param {Object} data - MO completion data {mo, lots_completed, timestamp}
   * @returns {Promise} Update result
   */
  static async markAsCompleted(data) {
    const query = `
      UPDATE tbl_m_manufacturing_orders
      SET status = 'completed', last_updated_at = ?
      WHERE nomor_mo = ?
    `;
    try {
      const ts = data.timestamp
        ? data.timestamp.replace('T', ' ').replace('Z', '')
        : new Date().toISOString().replace('T', ' ').replace('Z', '');
      const [result] = await db.execute(query, [ts, data.mo]);
      return result;
    } catch (error) {
      console.error('❌ Error marking MO as completed:', error.message);
      throw error;
    }
  }
}

module.exports = MOModel;
