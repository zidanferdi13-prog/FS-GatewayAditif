'use strict';

/**
 * MO Service
 * Handles all Manufacturing Order business logic:
 *   - Fetch MO data from Kanban API (or resume existing)
 *   - Parse RM items and calculate per-lot target weights
 *   - Persist to database
 *   - Record weight records on confirm
 *   - Provide lot print data
 *   - Mark MO as completed
 */

const crypto = require('crypto');
const MOModel   = require('../models/moModel');
const { fetchData, sendData } = require('./apiService');
const config    = require('../config/config');

/* ── Input validation helpers ──────────────────────────── */

function isValidMONumber(nomor_mo) {
  if (typeof nomor_mo !== 'string') return false;
  if (nomor_mo.length === 0 || nomor_mo.length > 60) return false;
  return /^[A-Za-z0-9\-_./]+$/.test(nomor_mo);
}

/**
 * Build lot identity string from MO number + lot sequence.
 * MO "WAN/MO/26/07/8657" + lot 1 → "2026/07/8657/LOT001"
 * Falls back to "LOTxxx" if MO doesn't match known pattern.
 */
function buildLotIdentity(nomor_mo, lotNumber) {
  const m = String(nomor_mo).match(/(\d{2})\/(\d{2})\/(\d+)$/);
  if (!m) return `LOT${String(lotNumber).padStart(3, '0')}`;
  return `${m[1]}/${m[2]}/${m[3]}/LOT${String(lotNumber).padStart(3, '0')}`;
}

/* ── Resume helpers ────────────────────────────────────── */

/**
 * Build resume payload from existing MO data + weight records.
 * Calculates how many lots are fully done and which RM index to resume at.
 */
async function buildResumePayload(mo) {
  const rmDetails = (mo.rm_details || []).filter(d => d.id !== null);
  const totalRM = rmDetails.length;

  const produkRMItems = rmDetails.map(r => r.item);
  const produkRMQty   = rmDetails.map(r => parseFloat(r.qty));
  const targetWeights = rmDetails.map(r => parseFloat(r.target_weight));

  const maxLot = await MOModel.getMaxLotNumber(mo.id);
  let currentLot = 1;      // 1-based — default: start at lot 1
  let currentRMIndex = 0;

  if (maxLot > 0) {
    const lotRecords = await MOModel.getWeightRecordsByLot(mo.id, maxLot);
    if (lotRecords.length >= totalRM) {
      // Previous lot fully complete, start next
      currentLot = maxLot + 1;
      currentRMIndex = 0;
    } else {
      // Still in the middle of this lot
      currentLot = maxLot;
      currentRMIndex = lotRecords.length;
    }
  }

  // Safety: never overshoot qty_plan
  if (currentLot > mo.qty_plan) {
    currentLot = mo.qty_plan;
    currentRMIndex = 0;
  }

  console.log(`♻️  Resuming MO ${mo.nomor_mo}: lot ${currentLot}, RM[${currentRMIndex}] next`);

  return {
    mo_id:           mo.id,
    nomor_mo:        mo.nomor_mo,
    qty_plan:        mo.qty_plan,
    lot:             currentLot,
    current_rm:      currentRMIndex,
    produk_rm_items: produkRMItems,
    produk_rm_qty:   produkRMQty,
    produk_rm_kategori: rmDetails.map(r => r.kategori || ''),
    target_weights:  targetWeights,
    total_rm:        totalRM,
  };
}

/* ── Main MO fetch + process ───────────────────────────── */

/**
 * Fetch MO from Kanban API, parse RM data, save to DB.
 * If MO already exists in DB with status 'active', resume instead.
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

  // ── Check if MO already exists in DB ──
  const existing = await MOModel.getByNomorMO(nomor_mo);
  if (existing) {
    if (existing.status === 'completed') {
      throw new Error('MO sudah selesai');
    }
    // Resume active MO — calc resume point from lot_number
    return await buildResumePayload(existing);
  }

  // ── Fetch from Kanban API ──
  const apiData = await sendData(config.api.kanban.findOneEndpoint, { nomor_mo });
  const item    = apiData;

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
  const produkRMKategori = [];
  const targetWeights  = [];

  produk_rm.forEach((rm, i) => {
    console.log(`  📦 RM[${i + 1}]: ${rm.item}  qty=${rm.qty}  kategori=${rm.kategori}`);
    produkRMItems.push(rm.item);
    produkRMQty.push(rm.qty);
    produkRMKategori.push(rm.kategori || '');
    targetWeights.push(parseFloat((rm.qty / qty_plan).toFixed(4)));
  });

  console.log(`📦 MO ${moNumber} — ${produkRMItems.length} RM, ${qty_plan} lot(s)`);

  /* — Persist to DB — */
  const moUUID = crypto.randomUUID();
  const rmIDs  = produkRMItems.map(() => crypto.randomUUID());
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
        target_weight: targetWeights[i],
        kategori: produkRMKategori[i]
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
    lot:             1,              // 1-based — lot 1 for fresh MO
    current_rm:      0,
    produk_rm_items: produkRMItems,
    produk_rm_qty:   produkRMQty,
    produk_rm_kategori: produkRMKategori,
    target_weights:  targetWeights,
    total_rm:        produkRMItems.length
  };
}

/* ── Weight record (insert on confirm) ─────────────────── */

/**
 * Insert a weight record when operator confirms weighing.
 * @param {object} data - from 'print-confirm' socket event
 *   { mo: nomor_mo, lot, rm_index, rm_name, weight, target, timestamp }
 */
async function recordPrintConfirm(data) {
  try {
    const mo = await MOModel.getByNomorMO(data.mo);
    if (!mo) {
      console.error(`❌ MO ${data.mo} not found for weight record`);
      return;
    }

    const rmDetails = await MOModel.getRMDetailsByMO(mo.id);
    const rmDetail  = rmDetails[data.rm_index];
    if (!rmDetail) {
      console.error(`❌ RM index ${data.rm_index} not found for MO ${data.mo}`);
      return;
    }

    await MOModel.createWeightRecord({
      id:            crypto.randomUUID(),
      rm_detail_id:  rmDetail.id,
      actual_weight: data.weight,
      lot_number:    data.lot,
      no_lot:        buildLotIdentity(data.mo, data.lot),
      timestamp:     data.timestamp || new Date().toISOString(),
    });
    console.log(`✅ Weight recorded: MO=${data.mo} Lot=${data.lot} RM[${data.rm_index}]=${data.weight}kg`);
  } catch (err) {
    console.error('❌ recordPrintConfirm error:', err.message);
    throw err;
  }
}

/* ── Print data for a completed lot ────────────────────── */

/**
 * Get all RM data for printing when a lot clears.
 * Returns MO + lot info + each RM's target and actual weight.
 * @param {string} nomor_mo
 * @param {number} lotNumber
 * @returns {Promise<object>} { mo, lot, nama_produk, items: [{ rm_index, rm_name, target_weight, actual_weight }] }
 */
async function getLotPrintData(nomor_mo, lotNumber) {
  const mo = await MOModel.getByNomorMO(nomor_mo);
  if (!mo) throw new Error('MO tidak ditemukan');

  const rmDetails = (mo.rm_details || []).filter(d => d.id !== null);
  const totalRM = rmDetails.length;
  if (totalRM === 0) throw new Error('MO tidak memiliki RM detail');

  // Get weight records for this specific lot
  const lotWeights = await MOModel.getWeightRecordsByLot(mo.id, lotNumber);

  const items = rmDetails.map((rm, i) => {
    const wr = lotWeights[i];
    return {
      rm_index:      i,
      rm_name:       rm.item,
      target_weight: parseFloat(rm.target_weight),
      actual_weight: wr ? parseFloat(wr.actual_weight) : null,
    };
  });

  return {
    mo:           nomor_mo,
    lot:          lotNumber,
    lot_identity: buildLotIdentity(nomor_mo, lotNumber),
    nama_produk:  mo.nama_produk,
    items,
  };
}

/* ── MO completion ─────────────────────────────────────── */

async function completeMO(data) {
  try {
    await MOModel.markAsCompleted(data);
    console.log(`✅ MO ${data.mo} marked as completed in DB`);
    console.log(data, "payload ke api")
  } catch (dbErr) {
    console.error('❌ DB error on MO completion (non-fatal):', dbErr.message);
  }
}

/* ── MO listing ──────────────────────────────────────────── */

async function listMOs() {
  return await MOModel.getAll();
}

/* ── MO detail ──────────────────────────────────────────── */

async function getMODetail(nomor_mo) {
  const mo = await MOModel.getByNomorMO(nomor_mo);
  if (!mo) return null;

  const weightRecords = await MOModel.getWeightRecordsForMO(mo.id);

  const rmWeightMap = {};
  for (const wr of weightRecords) {
    if (!rmWeightMap[wr.rm_detail_id]) rmWeightMap[wr.rm_detail_id] = [];
    rmWeightMap[wr.rm_detail_id].push({
      id:            wr.id,
      actual_weight: parseFloat(wr.actual_weight),
      lot_number:    wr.lot_number,
      no_lot:        wr.no_lot,
      timestamp:     wr.timestamp,
    });
  }

  const rmDetails = (mo.rm_details || []).map(rm => ({
    ...rm,
    qty:           parseFloat(rm.qty),
    target_weight: parseFloat(rm.target_weight),
    kategori:      rm.kategori || '',
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

/* ── Reprint ──────────────────────────────────────────── */

async function reprintRM(data) {
  console.log(`🔄 Reprint: MO=${data.mo} lot=${data.lot} RM=${data.rm_index}`);
  return data;
}

async function reprintLot(nomor_mo, lot) {
  const mo = await MOModel.getByNomorMO(nomor_mo);
  if (!mo) throw new Error('MO tidak ditemukan');

  const weightRecords = await MOModel.getWeightRecordsForMO(mo.id);

  const latestWeightByRM = {};
  for (const wr of weightRecords) {
    if (!latestWeightByRM[wr.rm_detail_id]) {
      latestWeightByRM[wr.rm_detail_id] = parseFloat(wr.actual_weight);
    }
  }

  const rmDetails = (mo.rm_details || []).filter(d => d.id !== null);
  let sent = 0;

  for (let i = 0; i < rmDetails.length; i++) {
    const rm = rmDetails[i];
    sent++;
  }

  console.log(`🔄 Reprint lot ${lot} for MO ${nomor_mo} — ${sent} RM`);
  return { success: true, count: sent };
}

module.exports = { fetchAndProcessMO, recordPrintConfirm, getLotPrintData, completeMO, listMOs, getMODetail, reprintRM, reprintLot };
