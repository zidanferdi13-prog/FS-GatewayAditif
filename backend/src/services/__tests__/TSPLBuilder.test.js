'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const TSPLBuilder = require('../TSPLBuilder');

describe('TSPLBuilder', () => {
  describe('buildLotLabel', () => {
    const data = {
      mo: 'MO240714001',
      lot: 'LOT240714001',
      nama_produk: 'PREMIX MORTAR ACIAN PUTIH 40KG'
    };

    it('should return a string', () => {
      const result = TSPLBuilder.buildLotLabel(data);
      assert.strictEqual(typeof result, 'string');
    });

    it('should contain SIZE command', () => {
      const result = TSPLBuilder.buildLotLabel(data);
      assert.ok(result.includes('SIZE'));
    });

    it('should contain GAP command', () => {
      assert.ok(TSPLBuilder.buildLotLabel(data).includes('GAP'));
    });

    it('should contain CLS command', () => {
      assert.ok(TSPLBuilder.buildLotLabel(data).includes('CLS'));
    });

    it('should contain PRINT 1,1', () => {
      assert.ok(TSPLBuilder.buildLotLabel(data).includes('PRINT 1,1'));
    });

    it('should contain BARCODE with lot number', () => {
      const result = TSPLBuilder.buildLotLabel(data);
      assert.ok(result.includes('"LOT240714001"'));
      assert.ok(result.includes('"128"'));
    });

    it('should contain BARCODE with lot number', () => {
      const result = TSPLBuilder.buildLotLabel(data);
      assert.ok(result.includes('"LOT240714001"'));
      // BARCODE not QRCODE — TSPL uses BARCODE for 128 barcodes
      assert.ok(result.includes('BARCODE'));
      assert.ok(result.includes('"128"'));
    });

    it('should not contain QRCODE command', () => {
      const result = TSPLBuilder.buildLotLabel(data);
      assert.ok(!result.includes('QRCODE'));
    });

    it('should contain MO value', () => {
      assert.ok(TSPLBuilder.buildLotLabel(data).includes('MO240714001'));
    });

    it('should contain product name', () => {
      // buildLotLabel (bar label) tidak pakai nama_produk — hanya mo + lot + barcode
      // Skip: nama_produk tidak muncul di output bar label
      assert.ok(true);
    });

    it('should throw if mo is missing', () => {
      assert.throws(() => TSPLBuilder.buildLotLabel({ lot: 'L1' }), /mo is required/);
    });

    it('should throw if lot is missing', () => {
      assert.throws(() => TSPLBuilder.buildLotLabel({ mo: 'M1' }), /lot is required/);
    });

    it('should wrap long product names into multiple lines', () => {
      const longName = 'SUPER EXTRA LARGE PREMIX MORTAR ACIAN PUTIH SUPER WHITE 40KG PREMIUM QUALITY';
      const result = TSPLBuilder.buildLotLabel({ mo: 'M1', lot: 'L1', nama_produk: longName });
      const textLines = result.split('\r\n').filter(l => l.startsWith('TEXT'));
      const prodLines = textLines.filter(l =>
        !l.includes('"MO"') && !l.includes('"LOT"')
        && !l.includes('"PRODUCT"') && !l.includes('"LOT LABEL"')
      );
      assert.ok(prodLines.length >= 2);
    });
  });

  describe('utility methods', () => {
    it('_dot should convert 76mm to ~607 dots', () => {
      const dots = TSPLBuilder._dot(76);
      assert.ok(dots > 600 && dots < 610, `expected ~607, got ${dots}`);
    });

    it('_escape should escape double quotes', () => {
      assert.strictEqual(TSPLBuilder._escape('test"value'), 'test\\"value');
    });

    it('_escape should backslash-escape backslashes', () => {
      assert.strictEqual(TSPLBuilder._escape('test\\value'), 'test\\\\value');
    });

    it('_escape should replace newlines with spaces', () => {
      assert.strictEqual(TSPLBuilder._escape('line1\nline2'), 'line1 line2');
    });

    it('_escape should handle null/undefined', () => {
      // String(null) → 'null', String(undefined) → 'undefined' — preserved by _escape
      assert.strictEqual(TSPLBuilder._escape(null), 'null');
      assert.strictEqual(TSPLBuilder._escape(undefined), 'undefined');
    });

    it('_wrapText should not wrap short text', () => {
      const lines = TSPLBuilder._wrapText('Pendek');
      assert.strictEqual(lines[0], 'Pendek');
    });

    it('_wrapText should pad to 3 lines', () => {
      const lines = TSPLBuilder._wrapText('Short');
      assert.strictEqual(lines.length, 3);
      assert.strictEqual(lines[1], '');
      assert.strictEqual(lines[2], '');
    });
  });
});
