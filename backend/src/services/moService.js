'use strict';

/**
 * MO Service
 * Handles all Manufacturing Order business logic:
 *   - Fetch MO data from Kanban API
 *   - Parse RM items and calculate per-lot target weights
 *   - Persist to database (non-blocking — errors are logged, not thrown)
 *   - Record print confirmations
 *   - Mark MO as completed
 */

const crypto = require('crypto');
const MOModel   = require('../models/moModel');
const { sendData, fetchData } = require('./apiService');
const config    = require('../config/config');

/* ── Input validation helpers ──────────────────────────── */

/**
 * Validate that a nomor_mo string is safe before using it in API calls.
 * Allowed: alphanumeric, hyphens, underscores, max 60 chars.
 */
function isValidMONumber(nomor_mo) {
  if (typeof nomor_mo !== 'string') return false;
  if (nomor_mo.length === 0 || nomor_mo.length > 60) return false;
  return /^[A-Za-z0-9\-_./]+$/.test(nomor_mo);
}

/* ── Main MO fetch + process ───────────────────────────── */

/**
 * Fetch MO from Kanban API, parse RM data, save to DB.
 * @param {string} nomor_mo
 * @returns {Promise<object>} Processed MO payload ready to emit to the client
 * @throws {Error} when API returns an error or nomor_mo is invalid
 */
async function fetchAndProcessMO(nomor_mo) {
  if (!isValidMONumber(nomor_mo)) {
    const err = new Error('Nomor MO tidak valid');
    err.status = 400;
    throw err;
  }

  const apiData = await sendData(config.api.kanban.findOneEndpoint, { nomor_mo });
  const item    = apiData;   // alias — keep original naming intent

  const {
    t_mo_id, work_center, nomor_mo: moNumber, nama_produk,
    schedule_mo, qty_plan, lot, produk_rm
  } = item.data;

  if (!Array.isArray(produk_rm) || produk_rm.length === 0) {
    throw new Error('Data RM kosong pada respon API');
  }
  if (!qty_plan || qty_plan <= 0) {
    throw new Error('qty_plan tidak valid pada respon API');
  }

  /* — Parse RM items — */
  const produkRMItems  = [];
  const produkRMQty    = [];
  const targetWeights  = [];

  produk_rm.forEach((rm, i) => {
    console.log(`  📦 RM[${i + 1}]: ${rm.item}  qty=${rm.qty}`);
    produkRMItems.push(rm.item);
    produkRMQty.push(rm.qty);
    targetWeights.push(parseFloat((rm.qty / qty_plan).toFixed(4)));
  });

  console.log(`📦 MO ${moNumber} — ${produkRMItems.length} RM, ${qty_plan} lot(s)`);

  /* — Persist to DB (best-effort, non-blocking) — */
  const moUUID  = crypto.randomUUID();
  const rmIDs   = produkRMItems.map(() => crypto.randomUUID());
  try {
    await MOModel.create({
      id: moUUID, t_mo_id, work_center, nomor_mo: moNumber, nama_produk,
      schedule_mo, qty_plan, lot: lot || 0, total_rm: produkRMItems.length
    });
    console.log(`✅ MO ${moNumber} saved to DB`);

    for (let i = 0; i < produkRMItems.length; i++) {
      await MOModel.createRMDetail(rmIDs[i], {
        mo_id: moUUID,
        item:  produkRMItems[i],
        qty:   produkRMQty[i],
        target_weight: targetWeights[i]
      });
    }
    console.log('✅ RM details saved to DB');
  } catch (dbErr) {
    console.error('❌ DB error (non-fatal):', dbErr.message);
    // Continue — DB failure must not block the weighing session
  }

  return {
    mo_id:           moUUID,
    nomor_mo:        moNumber,
    qty_plan,
    lot:             lot || 0,
    produk_rm_items: produkRMItems,
    produk_rm_qty:   produkRMQty,
    target_weights:  targetWeights,
    total_rm:        produkRMItems.length
  };
}

/* ── Print confirmation ────────────────────────────────── */

/**
 * Forward a print-confirm event to the external API.
 * @param {object} data - from the 'print-confirm' socket event
 */
async function recordPrintConfirm(data) {
  await sendData('/mo/print', { data });
  console.log(`✅ Print confirm sent: MO=${data.mo} lot=${data.lot} RM=${data.rm_index}`);
}

/* ── MO completion ─────────────────────────────────────── */

/**
 * Mark an MO as completed in DB and notify external API.
 * @param {object} data - from the 'mo-completed' socket event
 */
async function completeMO(data) {
  try {
    await MOModel.markAsCompleted(data);
    console.log(`✅ MO ${data.mo} marked as completed in DB`);
  } catch (dbErr) {
    console.error('❌ DB error on MO completion (non-fatal):', dbErr.message);
  }

  sendData('/mo/completed', { data }).catch(e =>
    console.error('❌ Failed to notify /mo/completed:', e.message)
  );
}

/* ── MO listing ──────────────────────────────────────────── */

/**
 * List all MOs from the database (newest first)
 * @returns {Promise<Array>}
 */
async function listMOs() {
  return await MOModel.getAll();
}

/* ── MO detail ──────────────────────────────────────────── */

/**
 * Get full MO detail including RM items + weight records
 * @param {string} nomor_mo
 * @returns {Promise<object|null>}
 */
async function getMODetail(nomor_mo) {
  const mo = await MOModel.getByNomorMO(nomor_mo);
  if (!mo) return null;

  // Fetch weight records for this MO
  const weightRecords = await MOModel.getWeightRecordsForMO(mo.id);

  // Group weight records by rm_detail_id
  const rmWeightMap = {};
  for (const wr of weightRecords) {
    if (!rmWeightMap[wr.rm_detail_id]) rmWeightMap[wr.rm_detail_id] = [];
    rmWeightMap[wr.rm_detail_id].push({
      id:            wr.id,
      actual_weight: parseFloat(wr.actual_weight),
      timestamp:     wr.timestamp,
    });
  }

  // Attach weight history to each RM detail
  const rmDetails = (mo.rm_details || []).map(rm => ({
    ...rm,
    qty:           parseFloat(rm.qty),
    target_weight: parseFloat(rm.target_weight),
    weights:       rmWeightMap[rm.id] || [],
  }));

  return {
    id:            mo.id,
    t_mo_id:       mo.t_mo_id,
    work_center:   mo.work_center,
    nomor_mo:      mo.nomor_mo,
    nama_produk:   mo.nama_produk,
    schedule_mo:   mo.schedule_mo,
    qty_plan:      mo.qty_plan,
    lot:           mo.lot,
    total_rm:      mo.total_rm,
    status:        mo.status,
    created_at:    mo.created_at,
    rm_details:    rmDetails,
  };
}

/* ── Reprint ────────────────────────────────────────────── */

/**
 * Re-trigger print for a specific RM weight record.
 * Re-emits the print-confirm data that was originally sent.
 * @param {object} data - { mo, lot, rm_index, rm_name, scale_used, weight, target }
 * @returns {Promise<void>}
 */
async function reprintRM(data) {
  await sendData('/mo/print', { data, reprint: true });
  console.log(`🔄 Reprint sent: MO=${data.mo} lot=${data.lot} RM=${data.rm_index}`);
}

module.exports = { fetchAndProcessMO, recordPrintConfirm, completeMO, listMOs, getMODetail, reprintRM };
