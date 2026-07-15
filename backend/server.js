'use strict';

/**
 * AMA Timbangan Aditif — Server Entry Point
 * Bootstraps HTTP, Socket.IO, and dual-scale serial connections.
 */

const http     = require('http');
const socketIo = require('socket.io');
const config   = require('./src/config/config');
const createApp = require('./src/app');

const SerialService = require('./src/services/serialService');
const moService     = require('./src/services/moService');
const PrinterService = require('./src/services/printerService');
const WeightController = require('./src/controllers/weightController');
const MOController = require('./src/controllers/moController');

/* ════════════════════════════════════════════════════════════
   SERIAL CLIENTS
════════════════════════════════════════════════════════════ */
const serialSmall = new SerialService(null, 'small', config.scales.small);
const serialLarge = new SerialService(null, 'large', config.scales.large);


/** Combined adapter — presents a single interface to controllers */
const serialClient = {
  sendLEDCommand: cmd =>
    serialSmall.sendLEDCommand(cmd) || serialLarge.sendLEDCommand(cmd),

  getLatestWeight: () => {
    const s = serialSmall.getLatestWeight();
    const l = serialLarge.getLatestWeight();
    if (!s) return l;
    if (!l) return s;
    return new Date(s.timestamp) >= new Date(l.timestamp) ? s : l;
  },

  getWeightHistory: (limit = 50) => {
    const merged = [
      ...serialSmall.getWeightHistory(limit),
      ...serialLarge.getWeightHistory(limit)
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return merged.slice(-limit);
  },

  getStatistics: () => {
    const weights = serialClient.getWeightHistory(200).map(w => w.weight);
    if (!weights.length) return null;
    const sum = weights.reduce((a, b) => a + b, 0);
    const latest = serialClient.getLatestWeight();
    return {
      count:   weights.length,
      average: parseFloat((sum / weights.length).toFixed(4)),
      min:     parseFloat(Math.min(...weights).toFixed(4)),
      max:     parseFloat(Math.max(...weights).toFixed(4)),
      latest:  latest ? latest.weight : null,
      stable:  latest ? latest.stable : false
    };
  },

  onWeightData: cb => { serialSmall.onWeightData(cb); serialLarge.onWeightData(cb); },
  setSocketIO:  io => { serialSmall.setSocketIO(io);  serialLarge.setSocketIO(io); },
  getHistory:   ()  => [
    ...serialSmall.getHistory(),
    ...serialLarge.getHistory()
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
  isConnected:  ()  => serialSmall.isConnected() || serialLarge.isConnected(),
  disconnect:   ()  => { serialSmall.disconnect(); serialLarge.disconnect(); }
};

/* ════════════════════════════════════════════════════════════
   EXPRESS + HTTP SERVER
════════════════════════════════════════════════════════════ */

/* ── Printer ──────────────────────────────────────────── */
const printerService = new PrinterService(config.printer);

const weightController = new WeightController(serialClient);
const moController     = new MOController(printerService);

const app    = createApp({ weightController, moController });
const server = http.createServer(app);

/* ════════════════════════════════════════════════════════════
   BOOT
════════════════════════════════════════════════════════════ */
(async () => {
  /* ── Serial connect ─── */
  serialSmall.connect();
  serialLarge.connect();

  /* HTTP LISTEN */
  server.listen(config.server.port, '0.0.0.0', () => {
    console.log('╔════════════════════════════════════════╗');
    console.log('║    AMA Timbangan Aditif  v2  — Ready   ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`🚀  http://0.0.0.0:${config.server.port}`);
    console.log(`📡  Small: ${config.scales.small.port} @ ${config.scales.small.baudRate} bps`);
    console.log(`📡  Large: ${config.scales.large.port} @ ${config.scales.large.baudRate} bps`);
    console.log(`🖨️  Printer: ${config.printer.name || '(none)'}`);
  });
})();

/* Optional: log overload to server console */
serialClient.onWeightData(data => {
  if (data.weight >= config.loadcell.overload_threshold) {
    console.warn(`⚠️  OVERLOAD [${data.scale}]: ${data.weight} kg`);
  }
});

/* ════════════════════════════════════════════════════════════
   SOCKET.IO
════════════════════════════════════════════════════════════ */
const io = socketIo(server, {
  cors: { origin: false }   // same-origin only; clients served by Express
});

serialClient.setSocketIO(io);

/* ── Input validators for socket events ──────────────── */
function isValidMOString(val) {
  return typeof val === 'string' && val.length > 0 && val.length <= 60 &&
    /^[A-Za-z0-9\-_./]+$/.test(val);
}

function isValidPrintData(data) {
  return data &&
    typeof data === 'object' &&
    isValidMOString(data.mo) &&
    Number.isFinite(data.weight) &&
    Number.isFinite(data.target) &&
    Number.isInteger(data.lot) && data.lot >= 1 &&
    Number.isInteger(data.rm_index);
}

/* ── Connection handler ──────────────────────────────── */
io.on('connection', socket => {
  console.log(`👤 Client connected: ${socket.id}`);

  /* Send current connection state to the joining client */
  socket.emit('serial-status:small', { scale: 'small', connected: serialSmall.isConnected() });
  socket.emit('serial-status:large', { scale: 'large', connected: serialLarge.isConnected() });
  socket.emit('serial-status',       { connected: serialClient.isConnected() });
  socket.emit('history-data',         serialClient.getHistory());

  socket.on('disconnect', () => {
    console.log(`👤 Client disconnected: ${socket.id}`);
  });

  /* ── request-history ──────────────────────────────── */
  socket.on('request-history', () => {
    socket.emit('history-data', serialClient.getHistory());
  });

  /* ── mo-confirmed ─────────────────────────────────── */
  socket.on('mo-confirmed', async data => {
    const nomor_mo = data && data.mo;

    if (!isValidMOString(nomor_mo)) {
      return socket.emit('mo-data-confirm', {
        success: false,
        error:   'Nomor MO tidak valid'
      });
    }

    console.log(`📋 MO confirmed by client: ${nomor_mo}`);

    try {
      const result = await moService.fetchAndProcessMO(nomor_mo);
      socket.emit('mo-data-confirm', { success: true, data: result });
    } catch (err) {
      console.error(`❌ moService.fetchAndProcessMO error: ${err.message}`);
      socket.emit('mo-data-confirm', { success: false, error: err.message });
    }
  });

  /* ── print-confirm ────────────────────────────────── */
  socket.on('print-confirm', async data => {
    if (!isValidPrintData(data)) {
      return console.warn('⚠️  print-confirm: invalid payload ignored');
    }

    console.log(`🖨️  Confirm — MO=${data.mo} lot=${data.lot} RM[${data.rm_index}] ${data.weight}/${data.target} kg`);

    try {
      await moService.recordPrintConfirm(data);
      socket.emit('print-confirm-ack', { success: true, mo: data.mo, lot: data.lot, rm_index: data.rm_index });
    } catch (err) {
      console.error('❌ recordPrintConfirm failed:', err.message);
      socket.emit('print-confirm-ack', { success: false, error: err.message });
    }
  });

  /* ── print-lot ────────────────────────────────────── */
  socket.on('print-lot', async data => {
    if (!data || !isValidMOString(data.mo) || !Number.isInteger(data.lot) || data.lot < 1) {
      socket.emit('print-lot-data', { success: false, error: 'Invalid payload: mo (string) and lot (1-based number) required' });
      return;
    }

    console.log(`🖨️🖨️  Print lot — MO=${data.mo} lot=${data.lot}`);

    try {
      const printData = await moService.getLotPrintData(data.mo, data.lot);
      socket.emit('print-lot-data', { success: true, data: printData });
      console.log(printData, "data yang mau diprint")
      console.log(`✅ Print lot data sent: MO=${data.mo} lot=${data.lot} (${printData.items.length} items)`);

      // Also send to local printer
      const result = await printerService.printLot(printData);
      console.log(`✅ Print sent to local printer (${result.method}): MO=${data.mo} lot=${data.lot}`);
    } catch (err) {
      console.error('❌ print-lot failed:', err.message);
      socket.emit('print-lot-data', { success: false, error: err.message });
    }
  });

  /* ── mo-completed ─────────────────────────────────── */
  socket.on('mo-completed', async data => {
    if (!data || !isValidMOString(data.mo)) {
      return console.warn('⚠️  mo-completed: invalid payload ignored');
    }

    console.log(`🏁 MO completed: ${data.mo}  lots=${data.lots_completed}`);

    moService.completeMO(data).catch(err =>
      console.error('❌ completeMO failed:', err.message)
    );
  });
});

/* ════════════════════════════════════════════════════════════
   GRACEFUL SHUTDOWN
════════════════════════════════════════════════════════════ */
process.on('SIGINT', () => {
  console.log('\n⚠️  Shutting down…');

  const forceExit = setTimeout(() => {
    console.warn('⚠️  Force exit after timeout');
    process.exit(1);
  }, 4000);

  serialClient.disconnect();

  server.close(() => {
    clearTimeout(forceExit);
    console.log('✅ Server closed');
    process.exit(0);
  });

  server.closeAllConnections?.();
});

