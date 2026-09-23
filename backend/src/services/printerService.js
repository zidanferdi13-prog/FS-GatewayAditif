'use strict';

/**
 * PrinterService
 * Sends raw TSPL labels to a CUPS printer queue on Debian/Linux.
 */

const { execFile } = require('child_process');
const TSPLBuilder = require('./TSPLBuilder');

class PrinterNotFoundError extends Error {
  constructor(m) { super(m); this.name = 'PrinterNotFoundError'; }
}
class PrinterOfflineError extends Error {
  constructor(m) { super(m); this.name = 'PrinterOfflineError'; }
}
class PrinterTimeoutError extends Error {
  constructor(m) { super(m); this.name = 'PrinterTimeoutError'; }
}

class PrinterService {
  constructor(config = {}) {
    this._printerName = config.name || '';
    this._timeout = config.timeout || 30000;
    console.log('PrinterService init: "' + this._printerName + '"');
  }

  getPrinterName() { return this._printerName; }

  async printLot(data) {
    if (!this._printerName)
      throw new PrinterOfflineError('No printer configured. Set PRINTER_NAME to CUPS queue name.');

    const tspl = TSPLBuilder.buildLotLabel({
      mo: String(data.mo || '').trim(),
      lot: String(data.lot_identity || data.lot || '').trim()
    });

    await this._execCupsPrint(tspl);
    return { method: 'cups-tspl' };
  }

  async _execCupsPrint(tspl) {
    console.log('🖨️  lp queue:', this._printerName, '| TSPL bytes:', tspl.length);
    return new Promise((resolve, reject) => {
      const child = execFile(
        'lp',
        ['-d', this._printerName, '-o', 'raw'],
        { timeout: this._timeout, maxBuffer: 1024 * 1024 },
        (err, stdout, stderr) => {
          if (err) {
            if (err.killed || err.signal === 'SIGTERM')
              return reject(new PrinterTimeoutError('Print timeout after ' + this._timeout + 'ms'));
            return reject(new PrinterOfflineError('CUPS print failed: ' + (stderr || err.message).trim()));
          }
          resolve(stdout.trim());
        }
      );

      child.stdin.on('error', err => {
        reject(new PrinterOfflineError('CUPS print failed: ' + err.message));
      });
      child.stdin.end(tspl);
    });
  }
}

module.exports = PrinterService;
module.exports.PrinterNotFoundError = PrinterNotFoundError;
module.exports.PrinterOfflineError  = PrinterOfflineError;
module.exports.PrinterTimeoutError  = PrinterTimeoutError;
