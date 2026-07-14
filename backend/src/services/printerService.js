'use strict';

/**
 * PrinterService
 * Transport layer for TSPL labels sent to a USB thermal printer.
 *
 * Writes raw TSPL bytes directly to the USB printer device interface
 * (GUID_DEVINTERFACE_USB_PRINTER) via CreateFile + WriteFile — bypasses
 * Windows Print Spooler entirely.
 *
 * Target: Xprinter XP-420B  (VID_2D37, PID_83D7)
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

/* ── GUID_DEVINTERFACE_USB_PRINTER ───────────────────────── */
const USB_PRINTER_GUID = '{28d78fad-5a12-11d1-ae5b-0000f803a8c2}';

/* ── PrinterService ───────────────────────────────────────── */

class PrinterService {
  /**
   * @param {object}  config
   * @param {string}  config.name       - Windows printer name (e.g. "Xprinter XP-420B")
   * @param {number}  config.timeout    - Timeout in ms for printRaw (default 30000)
   */
  constructor(config = {}) {
    this._printerName = config.name || '';
    this._timeout     = config.timeout || 30000;
    this._connected   = false;
    this._devicePath  = null;  // resolved USB device path, e.g. \\.\USB#VID_...

    console.log(`🏭 PrinterService init: "${this._printerName}"`);
  }

  /**
   * Resolve USB device path from DeviceClasses registry.
   *
   * reg query yields subkeys like ##?#USB#VID_XXXX&PID_XXXX#SERIAL#{guid}
   * Strip ##?# → prepend \\.\ → usable by CreateFile()
   * Filter by known Xprinter VID: 2D37
   *
   * @returns {Promise<string|null>}
   */
  async _resolveDevicePath() {
    return new Promise((resolve) => {
      const regPath = 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceClasses\\{28d78fad-5a12-11d1-ae5b-0000f803a8c2}';

      execFile('reg', ['query', regPath], { timeout: 10000 }, (err, stdout) => {
        if (err) return resolve(null);
        const lines = (stdout || '').split('\n');
        for (const line of lines) {
          // Lines look like:
          //   HKEY_LOCAL_MACHINE\...\DeviceClasses\{guid}\<subkey>    REG_SZ   ...
          // We want the subkey that contains USB#VID_2D37
          if (!line.includes('USB#VID_2D37')) continue;

          // Extract subkey: everything after the last backslash
          const idx = line.lastIndexOf('\\');
          if (idx < 0) continue;
          let subkey = line.substring(idx + 1).trim();
          // subkey starts with ##?# — strip that
          const usbIdx = subkey.indexOf('USB#');
          if (usbIdx < 0) continue;
          subkey = subkey.substring(usbIdx);

          // Build device path
          const devPath = '\\\\.\\' + subkey;
          return resolve(devPath);
        }
        resolve(null);
      });
    });
  }

  /**
   * Connect to printer — resolves USB device path.
   * @returns {Promise<boolean>}
   * @throws {PrinterNotFoundError}
   */
  async connect() {
    if (!this._printerName) {
      throw new PrinterNotFoundError(
        'Printer name is empty. Set PRINTER_NAME env variable.'
      );
    }

    const devPath = await this._resolveDevicePath();
    if (!devPath) {
      throw new PrinterNotFoundError(
        `Printer "${this._printerName}" not found. ` +
        `Verify printer is connected and driver is installed.`
      );
    }

    this._devicePath = devPath;
    this._connected  = true;
    console.log(`✅ Printer connected: "${this._printerName}"`);
    console.log(`   Device path: ${devPath}`);
    return true;
  }

  /**
   * Disconnect printer — reset state.
   */
  disconnect() {
    this._connected  = false;
    this._devicePath = null;
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
   * @param {string|number} data.lot
   * @param {string} data.nama_produk
   * @returns {Promise<void>}
   */
  async printLot(data) {
    try {
      const tspl = TSPLBuilder.buildLotLabel(data);
      await this.printRaw(tspl);
    } catch (err) {
      console.error(`❌ printLot failed (MO=${data.mo} lot=${data.lot}): ${err.message}`);
      throw err;
    }
  }

  /**
   * Send raw TSPL command string to printer via direct USB write.
   *
   * Flow:
   *   1. Write TSPL string → UTF-8 bytes → temp binary file
   *   2. PowerShell: CreateFile(devicePath) → WriteFile(bytes) → CloseHandle
   *   3. Delete temp file (finally block)
   *
   * @param {string} tspl - TSPL command string
   * @returns {Promise<void>}
   * @throws {PrinterIOError}      on temp file failure
   * @throws {PrinterOfflineError}  on USB write failure
   * @throws {PrinterTimeoutError}  on timeout
   */
  async printRaw(tspl) {
    if (!this._devicePath) {
      throw new PrinterOfflineError(
        'Printer not connected. Call connect() first.'
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

    // ── Send via direct USB write ──
    try {
      await this._execUSBWrite(tmpFile);
      console.log(tmpFile)
      console.log(`✅ Print sent to "${this._printerName}" (${tspl.length} bytes)`);
    } finally {
      // Always clean up temp file
      try { await fs.promises.unlink(tmpFile); } catch (_) { /* ignore */ }
    }
  }

  /**
   * Write raw binary file to USB printer device via CreateFile + WriteFile.
   *
   * Uses PowerShell Add-Type (P/Invoke) — no external dependencies.
   *
   * @param {string} filePath - Absolute path to temp binary file
   * @returns {Promise<void>}
   */
  _execUSBWrite(filePath) {
    return new Promise((resolve, reject) => {
      const devPath = this._devicePath.replace(/'/g, "''");
      const fpath   = filePath.replace(/'/g, "''");

      const ps = `
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class USBWriter
{
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern IntPtr CreateFile(
        string lpFileName,
        uint dwDesiredAccess,
        uint dwShareMode,
        IntPtr lpSecurityAttributes,
        uint dwCreationDisposition,
        uint dwFlagsAndAttributes,
        IntPtr hTemplateFile);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool WriteFile(
        IntPtr hFile,
        byte[] lpBuffer,
        int nNumberOfBytesToWrite,
        out int lpNumberOfBytesWritten,
        IntPtr lpOverlapped);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);

    const uint GENERIC_WRITE = 0x40000000;
    const uint FILE_SHARE_READ = 1;
    const uint FILE_SHARE_WRITE = 2;
    const uint OPEN_EXISTING = 3;
    const uint FILE_ATTRIBUTE_NORMAL = 0x80;

    public static void Send(string devPath, string fileName)
    {
        IntPtr h = CreateFile(devPath, GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE,
            IntPtr.Zero, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, IntPtr.Zero);

        if (h.ToInt64() == -1)
            throw new Exception("CreateFile failed: " + Marshal.GetLastWin32Error());

        try
        {
            byte[] data = File.ReadAllBytes(fileName);
            int written = 0;

            if (!WriteFile(h, data, data.Length, out written, IntPtr.Zero))
                throw new Exception("WriteFile failed: " + Marshal.GetLastWin32Error());

            if (written != data.Length)
                throw new Exception("Incomplete write: " + written + "/" + data.Length);
        }
        finally
        {
            CloseHandle(h);
        }
    }
}
"@

[USBWriter]::Send('${devPath}', '${fpath}')
Write-Output "OK"
`;

      execFile(
        'powershell',
        ['-NoProfile', '-NonInteractive', '-Command', ps],
        { timeout: this._timeout, maxBuffer: 1024 * 1024 },
        (err, stdout, stderr) => {
          if (err) {
            if (err.killed || err.signal === 'SIGTERM') {
              return reject(new PrinterTimeoutError(
                `Print timeout after ${this._timeout}ms — printer may be busy or offline`
              ));
            }
            const errMsg = stderr || err.message || 'Unknown error';
            return reject(new PrinterOfflineError(
              `USB write failed for "${this._printerName}": ${errMsg.trim()}`
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
