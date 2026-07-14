'use strict';

/**
 * PrinterService
 * Transport layer for TSPL labels sent to a Windows label printer.
 *
 * Uses PowerShell Write-Printer cmdlet to send raw bytes directly
 * to the Windows Print Spooler — NOT Out-Printer which renders text.
 *
 * Target: XPrinter XP-420B via USB001 port, driver resmi XP-420B.
 */

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const TSPLBuilder = require('./TSPLBuilder');

/* ── Custom Error Classes ─────────────────────────────────── */

class PrinterNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PrinterNotFoundError';
  }
}

class PrinterOfflineError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PrinterOfflineError';
  }
}

class PrinterTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PrinterTimeoutError';
  }
}

class PrinterIOError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PrinterIOError';
  }
}

/* ── PrinterService ───────────────────────────────────────── */

class PrinterService {
  /**
   * @param {object}  config
   * @param {string}  config.name    - Windows printer name (e.g. "XPrinter XP-420B")
   * @param {number}  config.timeout - Timeout in ms for printRaw (default 30000)
   */
  constructor(config = {}) {
    this._printerName = config.name || '';
    this._timeout     = config.timeout || 30000;
    this._connected   = false;
  }

  /**
   * Verify printer exists and is reachable via Windows Print Spooler.
   * Runs `Get-Printer` PowerShell command to check.
   * @returns {Promise<boolean>}
   * @throws {PrinterNotFoundError} if printer name not found
   */
  async connect() {
    if (!this._printerName) {
      throw new PrinterNotFoundError(
        'Printer name is empty. Set PRINTER_NAME env variable.'
      );
    }

    try {
      const exists = await this._checkPrinterExists();
      if (!exists) {
        throw new PrinterNotFoundError(
          `Printer "${this._printerName}" not found in Windows printer list. ` +
          `Verify the name matches "Devices & Printers" exactly.`
        );
      }
      this._connected = true;
      console.log(`✅ Printer connected: "${this._printerName}"`);
      return true;
    } catch (err) {
      if (err instanceof PrinterNotFoundError) throw err;
      // If PowerShell itself fails, log but don't block — printer may still work
      console.warn(`⚠️  Printer: could not verify "${this._printerName}": ${err.message}`);
      this._connected = true; // optimistically mark as connected
      return true;
    }
  }

  /**
   * Check if printer name exists in Windows printer list.
   * @returns {Promise<boolean>}
   */
  async _checkPrinterExists() {
    return new Promise((resolve, reject) => {
      const ps = `(Get-Printer -Name "${this._printerName}" -ErrorAction SilentlyContinue) -ne $null`;
      execFile(
        'powershell',
        ['-NoProfile', '-NonInteractive', '-Command', ps],
        { timeout: 10000 },
        (err, stdout) => {
          if (err) return resolve(false);
          resolve(stdout.trim() === 'True');
        }
      );
    });
  }

  /**
   * Disconnect printer — reset connection state.
   */
  disconnect() {
    this._connected = false;
    console.log('⚠️  Printer disconnected');
  }

  /**
   * Check if printer service is in connected state.
   * @returns {boolean}
   */
  isConnected() {
    return this._connected;
  }

  /**
   * Get configured printer name.
   * @returns {string}
   */
  getPrinterName() {
    return this._printerName;
  }

  /**
   * Print a lot label.
   * Builds TSPL via TSPLBuilder, sends via printRaw.
   *
   * @param {object} data
   * @param {string} data.mo
   * @param {string} data.lot
   * @param {string} data.nama_produk
   * @returns {Promise<void>}
   */
  async printLot(data) {
    const tspl = TSPLBuilder.buildLotLabel(data);
    await this.printRaw(tspl);
  }

  /**
   * Send raw TSPL command string to printer via Windows Print Spooler.
   *
   * Flow:
   *   1. Write TSPL string → UTF-8 bytes → temp binary file
   *   2. PowerShell Write-Printer -Name "<name>" -Path "<tempfile>"
   *   3. Delete temp file (finally block)
   *   4. Resolve on success, reject typed error on failure
   *
   * @param {string} tspl - TSPL command string
   * @returns {Promise<void>}
   * @throws {PrinterIOError}      on temp file failure
   * @throws {PrinterOfflineError}  on PowerShell/print failure
   * @throws {PrinterTimeoutError}  on timeout
   */
  async printRaw(tspl) {
    if (!this._printerName) {
      throw new PrinterNotFoundError(
        'Printer name not configured. Set PRINTER_NAME env variable.'
      );
    }

    // ── Write temp file ──
    const tmpFile = path.join(
      os.tmpdir(),
      `tspl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.bin`
    );

    let fileHandle = null;
    try {
      fileHandle = await fs.promises.open(tmpFile, 'w');
      await fileHandle.write(tspl, 0, 'utf8');
      await fileHandle.close();
      fileHandle = null;
    } catch (err) {
      if (fileHandle) await fileHandle.close().catch(() => {});
      throw new PrinterIOError(
        `Failed to write TSPL temp file: ${err.message}`
      );
    }

    // ── Send via PowerShell Write-Printer ──
    try {
      await this._execWritePrinter(tmpFile);
      console.log(`✅ Print sent to "${this._printerName}" (${tspl.length} bytes)`);
    } finally {
      // Always clean up temp file
      try { await fs.promises.unlink(tmpFile); } catch (_) { /* ignore */ }
    }
  }

  /**
   * Execute PowerShell Write-Printer command with timeout.
   * @param {string} filePath - Absolute path to temp file
   * @returns {Promise<void>}
   */
  _execWritePrinter(filePath) {
    return new Promise((resolve, reject) => {
      const ps = `Write-Printer -Name "${this._printerName}" -Path "${filePath}"`;

      execFile(
        'powershell',
        ['-NoProfile', '-NonInteractive', '-Command', ps],
        { timeout: this._timeout },
        (err, stdout, stderr) => {
          if (err) {
            // Timeout
            if (err.killed || err.signal === 'SIGTERM') {
              return reject(new PrinterTimeoutError(
                `Print timeout after ${this._timeout}ms — printer may be busy or offline`
              ));
            }

            // PowerShell error — capture stderr
            const errMsg = stderr || err.message || 'Unknown PowerShell error';
            return reject(new PrinterOfflineError(
              `Print failed for "${this._printerName}": ${errMsg.trim()}`
            ));
          }

          // Check stderr for warnings
          if (stderr && stderr.includes('Error')) {
            return reject(new PrinterOfflineError(
              `Print warning: ${stderr.trim()}`
            ));
          }

          resolve();
        }
      );
    });
  }
}

module.exports = PrinterService;
module.exports.PrinterNotFoundError = PrinterNotFoundError;
module.exports.PrinterOfflineError  = PrinterOfflineError;
module.exports.PrinterTimeoutError  = PrinterTimeoutError;
module.exports.PrinterIOError       = PrinterIOError;
