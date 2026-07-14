'use strict';

/**
 * TSPLBuilder
 * Pure static builder for TSPL (TSC Printer Language) commands.
 * No I/O, no state — pure functions.
 *
 * Coordinate system: 203 DPI (≈8 dot/mm).
 * Label: 76mm × 100mm → 599 × 787 dots.
 *
 * Built-in TSPL fonts:
 *   Font 5  — 32×53 dot (titles, large)
 *   Font 3  — 16×24 dot (section labels)
 *   Font 2  — 12×20 dot (data values)
 */

class TSPLBuilder {
  /** Label dimensions in mm */
  static get LABEL_WIDTH_MM()  { return 76; }
  static get LABEL_HEIGHT_MM() { return 100; }

  /** Gap between labels in mm */
  static get GAP_MM() { return 3; }

  /** Default margins in dots */
  static get MARGIN_X() { return 40; }   // ≈5mm
  static get MARGIN_Y() { return 30; }   // ≈4mm

  /** DPI constant */
  static get DPI() { return 203; }

  /** Max chars per line at Font 2 */
  static get MAX_CHARS_PER_LINE() { return 44; }

  /** Max wrap lines for product name */
  static get MAX_WRAP_LINES() { return 3; }

  /**
   * Convert millimeters to dots @ 203 DPI.
   * @param {number} mm
   * @returns {number} dots
   */
  static _dot(mm) {
    return Math.round((TSPLBuilder.DPI / 25.4) * mm);
  }

  /**
   * Escape special characters for TSPL TEXT command.
   * TSPL strings must not contain unescaped double quotes or newlines.
   * @param {string} text
   * @returns {string}
   */
  static _escape(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\r?\n|\r/g, ' ')
      .replace(/[^\x20-\x7E]/g, ''); // strip non-printable except space
  }

  /**
   * Word-wrap text for Font 2 (fixed-width ~12px per char).
   * Splits on word boundaries, respects MAX_CHARS_PER_LINE.
   * @param {string} text
   * @param {number} [maxChars=44]
   * @returns {string[]} Array of lines (max MAX_WRAP_LINES)
   */
  static _wrapText(text, maxChars = TSPLBuilder.MAX_CHARS_PER_LINE) {
    const sanitized = TSPLBuilder._escape(text);
    if (sanitized.length <= maxChars) return [sanitized];

    const words = sanitized.split(' ');
    const lines = [];
    let current = '';

    for (const word of words) {
      // +1 for space separator
      if (current.length + word.length + 1 > maxChars) {
        if (current) lines.push(current.trim());
        current = word;
        // Single word longer than maxChars — force cut
        if (current.length > maxChars) {
          while (current.length > maxChars) {
            lines.push(current.slice(0, maxChars));
            current = current.slice(maxChars);
          }
        }
      } else {
        current += (current ? ' ' : '') + word;
      }
    }
    if (current) lines.push(current.trim());

    // Pad with empty lines if fewer than max
    while (lines.length < TSPLBuilder.MAX_WRAP_LINES) {
      lines.push('');
    }

    return lines.slice(0, TSPLBuilder.MAX_WRAP_LINES);
  }

  /**
   * Build complete TSPL lot label.
   *
   * @param {object} data
   * @param {string} data.mo           - Manufacturing Order number
   * @param {string} data.lot          - Lot number
   * @param {string} data.nama_produk  - Product name
   * @returns {string} Full TSPL command string
   *
   * @example
   * TSPLBuilder.buildLotLabel({
   *   mo: 'MO240714001',
   *   lot: 'LOT240714001',
   *   nama_produk: 'PREMIX MORTAR ACIAN PUTIH 40KG'
   * });
   */
  static buildLotLabel(data) {
    if (!data) throw new Error('TSPLBuilder: data is required');
    if (!data.mo)   throw new Error('TSPLBuilder: mo is required');
    if (!data.lot)  throw new Error('TSPLBuilder: lot is required');

    const mo  = TSPLBuilder._escape(data.mo);
    const lot = TSPLBuilder._escape(data.lot);
    const produkLines = TSPLBuilder._wrapText(data.nama_produk || '');

    const MX = TSPLBuilder.MARGIN_X;  // 40
    const W  = TSPLBuilder._dot(TSPLBuilder.LABEL_WIDTH_MM);   // 599
    const H  = TSPLBuilder._dot(TSPLBuilder.LABEL_HEIGHT_MM);  // 787
    const G  = TSPLBuilder._dot(TSPLBuilder.GAP_MM);           // 24

    const Y_TITLE     = 30;
    const Y_LINE      = 85;
    const Y_MO_LABEL  = 145;
    const Y_MO_VAL    = 170;
    const Y_LOT_LABEL = 220;
    const Y_LOT_VAL   = 245;
    const Y_PRD_LABEL = 295;
    const Y_PRD_VALS  = [320, 342, 364];
    const Y_BARCODE   = 400;
    const Y_QRCODE    = 520;

    const lines = [];

    // ── Header ──
    lines.push(`SIZE ${W} dot,${H} dot`);
    lines.push(`GAP ${G} dot,0`);
    lines.push(`DIRECTION 1`);
    lines.push(`CLS`);
    lines.push('');

    // ── Title — centered ──
    lines.push(`TEXT ${MX},${Y_TITLE},"5",0,1,1,"LOT LABEL"`);
    lines.push('');

    // ── Separator line ──
    lines.push(`BARCODE ${MX},${Y_LINE},"128",40,0,0,2,2,"${lot}"`);
    lines.push('');

    // ── MO ──
    lines.push(`TEXT ${MX},${Y_MO_LABEL},"3",0,1,1,"MO"`);
    lines.push(`TEXT ${MX},${Y_MO_VAL},"2",0,1,1,"${mo}"`);
    lines.push('');

    // ── LOT ──
    lines.push(`TEXT ${MX},${Y_LOT_LABEL},"3",0,1,1,"LOT"`);
    lines.push(`TEXT ${MX},${Y_LOT_VAL},"2",0,1,1,"${lot}"`);
    lines.push('');

    // ── PRODUCT ──
    lines.push(`TEXT ${MX},${Y_PRD_LABEL},"3",0,1,1,"PRODUCT"`);
    for (let i = 0; i < TSPLBuilder.MAX_WRAP_LINES; i++) {
      if (produkLines[i]) {
        lines.push(`TEXT ${MX},${Y_PRD_VALS[i]},"2",0,1,1,"${produkLines[i]}"`);
      }
    }
    lines.push('');

    // ── Barcode (Code128, full width) ──
    lines.push(`BARCODE ${MX},${Y_BARCODE},"128",60,1,0,2,2,"${lot}"`);
    lines.push('');

    // ── QR Code (right side) ──
    const QR_X = 360;  // ≈45mm
    lines.push(`QRCODE ${QR_X},${Y_QRCODE},M,6,A,0,"${lot}"`);
    lines.push('');

    // ── Print command ──
    lines.push(`PRINT 1,1`);

    return lines.join('\r\n');
  }

  // ── Future builder stubs ──────────────────────────────────

  /**
   * Build TSPL pallet label.
   * @param {object} data - Future: pallet aggregation data
   * @returns {string} TSPL command string
   */
  static buildPalletLabel(data) {
    throw new Error('TSPLBuilder: buildPalletLabel not yet implemented');
  }

  /**
   * Build TSPL box label.
   * @param {object} data - Future: box scan data
   * @returns {string} TSPL command string
   */
  static buildBoxLabel(data) {
    throw new Error('TSPLBuilder: buildBoxLabel not yet implemented');
  }

  /**
   * Build TSPL QC label.
   * @param {object} data - Future: QC check data
   * @returns {string} TSPL command string
   */
  static buildQCLabel(data) {
    throw new Error('TSPLBuilder: buildQCLabel not yet implemented');
  }

  /**
   * Build TSPL shipping label.
   * @param {object} data - Future: dispatch data
   * @returns {string} TSPL command string
   */
  static buildShippingLabel(data) {
    throw new Error('TSPLBuilder: buildShippingLabel not yet implemented');
  }
}

module.exports = TSPLBuilder;
