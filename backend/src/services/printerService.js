'use strict';

/**
 * Printer Serial Service
 * Handles local USB/Serial thermal printer for lot labels.
 * Output format: QR code content + lot info + RM items.
 * Protocol: plain text / ESC/POS (adjust per printer).
 */

const { SerialPort } = require('serialport');

class PrinterService {
  constructor(serialConfig = null) {
    this.serialConfig = serialConfig;
    this.port = null;
    this.connected = false;
    this._writeQueue = [];
    this._writing = false;
  }

  /**
   * Open serial connection to printer.
   * @param {object} config - { port, baudRate }
   */
  connect(config = null) {
    const cfg = config || this.serialConfig;
    if (!cfg || !cfg.port) {
      console.warn('⚠️  Printer: no serial port configured — prints will be logged only');
      return;
    }

    const portPath = cfg.port;
    const baudRate = cfg.baudRate || 9600;

    console.log(`🖨️  Printer: opening ${portPath} @ ${baudRate} bps`);

    try {
      this.port = new SerialPort({
        path: portPath,
        baudRate: baudRate,
        autoOpen: false,
      });

      this.port.open((err) => {
        if (err) {
          console.error(`❌ Printer: failed to open ${portPath}: ${err.message}`);
          this.connected = false;
          return;
        }
        console.log(`✅ Printer: connected on ${portPath}`);
        this.connected = true;
        // Flush any queued writes
        this._processQueue();
      });

      this.port.on('error', (err) => {
        console.error(`❌ Printer: port error: ${err.message}`);
        this.connected = false;
      });

      this.port.on('close', () => {
        console.log('⚠️  Printer: port closed');
        this.connected = false;
      });
    } catch (err) {
      console.error(`❌ Printer: init error: ${err.message}`);
    }
  }

  /**
   * Print a lot label.
   * @param {object} lotData - from getLotPrintData()
   *  { mo, lot, nama_produk, items: [{ rm_name, target_weight, actual_weight }] }
   */
  printLot(lotData) {
    const text = this._formatLotLabel(lotData);
    this._write(text);
  }

  /**
   * Format lot data into printer-friendly text.
   * Line width ~48 chars for 80mm thermal.
   */
  _formatLotLabel(data) {
    const sep = '=' .repeat(40);
    const dash = '-' .repeat(40);
    const lines = [];

    lines.push('');
    lines.push(sep);
    lines.push('  LOT LABEL');
    lines.push(sep);
    lines.push('');
    lines.push(`  MO     : ${data.mo}`);
    lines.push(`  Lot    : ${data.lot}`);
    lines.push(`  Produk : ${data.nama_produk || '-'}`);
    lines.push('');
    lines.push(dash);
    lines.push('  RM                        Target   Actual');
    lines.push(dash);

    data.items.forEach((item) => {
      const name = (item.rm_name || '').padEnd(25).slice(0, 25);
      const tgt = (item.target_weight || 0).toFixed(2).padStart(7);
      const act = item.actual_weight !== null
        ? item.actual_weight.toFixed(2).padStart(7)
        : '   N/A';
      lines.push(`  ${name} ${tgt}  ${act}`);
    });

    lines.push(dash);
    lines.push(`  Lot ${data.lot} selesai`);
    lines.push(sep);
    lines.push('');
    lines.push('');
    lines.push('');  // Extra feed

    return lines.join('\n');
  }

  /**
   * Write raw bytes to printer.
   * Queues if port is busy.
   */
  _write(text) {
    console.log(`🖨️  Printer queue:\n${text}`);
    this._writeQueue.push(Buffer.from(text, 'utf8'));
    if (this.connected && !this._writing) {
      this._processQueue();
    }
  }

  _processQueue() {
    if (this._writing || this._writeQueue.length === 0) return;
    this._writing = true;

    const buf = this._writeQueue.shift();
    if (!buf) {
      this._writing = false;
      return;
    }

    if (this.port && this.port.isOpen) {
      this.port.write(buf, (err) => {
        if (err) {
          console.error(`❌ Printer: write error: ${err.message}`);
        }
        this._writing = false;
        // Next item in queue
        setImmediate(() => this._processQueue());
      });
    } else {
      console.log('🖨️  Printer: not connected — logged above');
      this._writing = false;
      setImmediate(() => this._processQueue());
    }
  }

  isConnected() {
    return this.connected;
  }

  disconnect() {
    if (this.port && this.port.isOpen) {
      this.port.close();
    }
    this.connected = false;
  }
}

module.exports = PrinterService;
