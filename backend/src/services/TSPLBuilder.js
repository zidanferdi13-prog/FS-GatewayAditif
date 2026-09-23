'use strict';

/**
 * TSPLBuilder
 * Pure static builder for TSPL (TSC Printer Language) commands.
 * No I/O, no state — pure functions.
 *
 * Coordinate system: 203 DPI (≈8 dot/mm).
 * Label: 40mm × 30mm → 320 × 240 dots.
 *
 * Built-in TSPL fonts:
 *   Font 5  — 32×53 dot (titles, large)
 *   Font 3  — 16×24 dot (section labels)
 *   Font 2  — 12×20 dot (data values)
 */

class TSPLBuilder {
  /** Label dimensions in mm */
  static get LABEL_WIDTH_MM()  { return 40; }
  static get LABEL_HEIGHT_MM() { return 30; }

  /** Gap between labels in mm */
  static get GAP_MM() { return 3; }

  /** Default margins in dots */
  static get MARGIN_X() { return 15; }   // ≈2mm
  static get MARGIN_Y() { return 10; }   // ≈1mm

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
    if (typeof text !== 'string') text = String(text);
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
    if (sanitized.length <= maxChars) {
      const result = [sanitized];
      while (result.length < TSPLBuilder.MAX_WRAP_LINES) result.push('');
      return result;
    }

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
   * Build TSPL bar label — minimal, 40×30mm.
   *
   * 40×30mm @ 203 DPI → 320×240 dots:
   *
   *   WAN/MO/XXXXX       (Font 2 — Nomor DO)
   *   ███████████████    (Barcode Code128)
   *   26XX/LOT001        (Font 2 — Nomor Lot)
   *
   * @param {object} data
   * @param {string}   data.mo   - Nomor DO/MO
   * @param {string|number} data.lot - Nomor Lot
   * @returns {string} TSPL command string
   */
  static buildLotLabel(data) {
    if (!data) throw new Error('TSPLBuilder: data is required');
    if (!data.mo)   throw new Error('TSPLBuilder: mo is required');
    if (data.lot === undefined || data.lot === null || data.lot === '')  throw new Error('TSPLBuilder: lot is required');

    const mo  = TSPLBuilder._escape(data.mo);
    const lot = TSPLBuilder._escape(data.lot);

    const W = TSPLBuilder._dot(TSPLBuilder.LABEL_WIDTH_MM);   // 320 dot
    const H = TSPLBuilder._dot(TSPLBuilder.LABEL_HEIGHT_MM);  // 240 dot
    const G = TSPLBuilder._dot(TSPLBuilder.GAP_MM);           // 24 dot
    const MX = TSPLBuilder.MARGIN_X;

    const lines = [];

    // ── Header ──
    lines.push(`SIZE ${W} dot,${H} dot`);
    lines.push(`SPEED 4`);
    lines.push(`DENSITY 8`);
    lines.push(`GAP ${G} dot,0`);
    lines.push(`DIRECTION 1`);
    lines.push(`CLS`);

    // ── Nomor DO ──
    lines.push(`TEXT ${MX},10,"2",0,1,1,"${mo}"`);

    // ── Barcode Code128 ──
    lines.push(`BARCODE ${MX},45,"128",95,0,0,1,2,"${lot}"`);

    // ── Nomor Lot di bawah barcode ──
    lines.push(`TEXT ${MX},165,"2",0,1,1,"${lot}"`);

    // ── Print ──
    lines.push(`PRINT 1,1`);

    return lines.join('\n');
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
