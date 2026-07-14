'use strict';

/**
 * Printer Service
 * Handles printing lot labels via Serial (COM) or Windows printer.
 *
 * Serial mode: raw text via SerialPort.
 * Windows mode: plain text via PowerShell Out-Printer (no native modules).
 */

const { SerialPort } = require('serialport');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class PrinterService {
  constructor(config = null) {
    this.config = config;
    this.port = null;
    this.connected = false;
    this._writeQueue = [];
    this._writing = false;
  }

  /**
   * Open connection to printer.
   * @param {object} cfg - { mode, name, port, baudRate }
   */
  connect(config = null) {
    const cfg = config || this.config;
    if (!cfg) {
      console.warn('⚠️  Printer: no config — prints will be logged only');
      return;
    }

    if (cfg.mode === 'windows') {
      this._connectWindows(cfg);
    } else {
      this._connectSerial(cfg);
    }
  }

  /* ───── Windows printer (PowerShell Out-Printer) ───── */

  _connectWindows(cfg) {
    if (!cfg.name) {
      console.warn('⚠️  Printer: PRINTER_NAME empty — prints will be logged only');
      return;
    }

    console.log(`🖨️  Printer: Windows mode — "${cfg.name}"`);
    this.connected = true;
    console.log(`✅ Printer: ready — "${cfg.name}"`);
  }

  /* ───── Serial printer (SerialPort) ───── */

  _connectSerial(cfg) {
    if (!cfg || !cfg.port) {
      console.warn('⚠️  Printer: no serial port configured — prints will be logged only');
      return;
    }

    const portPath = cfg.port;
    const baudRate = cfg.baudRate || 9600;

    console.log(`🖨️  Printer: serial — ${portPath} @ ${baudRate} bps`);

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

  /* ───── Print lot label ───── */

  /**
   * Print a lot label.
   * @param {object} lotData - from getLotPrintData()
   *  { mo, lot, nama_produk, items: [{ rm_name, target_weight, actual_weight }] }
   */
  async printLot(lotData) {
    const text = this._formatLotLabel(lotData);

    if (this.config?.mode === 'windows') {
      await this._printWindows(text);
    } else {
      this._write(text);
    }
  }

  /**
   * Send formatted text to Windows printer via PowerShell Out-Printer.
   */
  async _printWindows(text) {
    if (!this.config?.name) {
      console.log('🖨️  Printer: no printer name — logged only');
      return;
    }

    const tmpFile = path.join(os.tmpdir(), `prn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);

    try {
      // Write with UTF-16LE (PowerShell default) to preserve special chars
      fs.writeFileSync(tmpFile, text, 'ucs2');
    } catch (err) {
      console.error(`❌ Printer: temp file error: ${err.message}`);
      return;
    }

    try {
      await new Promise((resolve, reject) => {
        const ps = `Get-Content -Encoding Unicode "${tmpFile}" | Out-Printer -Name "${this.config.name}"`;
        execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], (err, stdout, stderr) => {
          // Clean up temp file
          try { fs.unlinkSync(tmpFile); } catch (_) {}

          if (err) {
            console.error(`❌ Printer: PowerShell error: ${err.message}`);
            if (stderr) console.error('  stderr:', stderr);
            reject(err);
          } else {
            console.log(`✅ Printer: lot sent to "${this.config.name}"`);
            resolve();
          }
        });
      });
    } catch (err) {
      // Already logged above
    }
  }

  /* ───── Format label text ───── */

  /**
   * Format lot data into printer-friendly text.
   * Line width for 76mm paper — ~32 chars monospace.
   */
  _formatLotLabel(data) {
    const W = 32; // chars for 76mm paper
    const sep = '='.repeat(W);
    const dash = '-'.repeat(W);
    const lines = [];

    lines.push(sep);
    lines.push('  LOT LABEL');
    lines.push(sep);
    lines.push(`  MO     : ${data.mo}`);
    lines.push(`  Lot    : ${data.lot}`);
    lines.push(`  Produk : ${data.nama_produk || '-'}`);
    lines.push(sep);
    lines.push('  RM           Target  Actual');
    lines.push(dash);

    (data.items || []).forEach((item) => {
      const name = (item.rm_name || '').padEnd(12).slice(0, 12);
      const tgt = (item.target_weight || 0).toFixed(2).padStart(7);
      const act = item.actual_weight !== null
        ? item.actual_weight.toFixed(2).padStart(7)
        : '    N/A';
      lines.push(`  ${name}${tgt} ${act}`);
    });

    lines.push(dash);
    lines.push(`  Lot ${data.lot} selesai`);
    lines.push(sep);
    lines.push('');
    lines.push('');
    lines.push('');

    return lines.join('\r\n');
  }

  /* ───── Serial write queue ───── */

  /**
   * Write raw bytes to serial printer.
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
