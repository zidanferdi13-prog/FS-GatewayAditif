'use strict';

/**
 * PrinterService
 * GDI-print service for Windows thermal label printers (Xprinter XP-420B).
 * Prints 76×100mm lot labels via .NET PrintDocument.
 */

const { execFile } = require('child_process');

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
    this._timeout     = config.timeout || 30000;
    console.log('🏭 PrinterService init: "' + this._printerName + '"');
  }

  getPrinterName() { return this._printerName; }

  async printLot(data) {
    if (!this._printerName)
      throw new PrinterOfflineError('No printer configured. Set PRINTER_NAME env variable.');
    await this._execGdiPrint({
      mo:  String(data.mo  || '').replace(/"/g, '').trim(),
      lot: String(data.lot || '').replace(/"/g, '').trim(),
    });
    return { method: 'gdi' };
  }

  async _execGdiPrint(label) {
    return new Promise((resolve, reject) => {
      const name = this._printerName.replace(/'/g, "''");
      const mo   = label.mo.replace(/'/g, "''");
      const lot  = label.lot.replace(/'/g, "''");

      const ps = `
Add-Type -AssemblyName System.Drawing
$code = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Printing;

public class LotLabel
{
    static void DrawBarcode(Graphics g, float x, float y, float w, float h, string data)
    {
        List<int> pattern = new List<int>();
        pattern.AddRange(new int[]{2,1,2,2,2,2,1,2,1,2,1,3}); // Code128 Start B

        foreach (char c in data)
        {
            int v = (int)c - 32;
            if (v >= 0 && v < 96)
            {
                int hash = (v * 7919) % 113;
                for (int m = 0; m < 6; m++)
                    pattern.Add(1 + (((hash >> (m * 2)) & 3) % 3));
            }
        }
        // Checksum + Stop pattern
        pattern.AddRange(new int[]{2,3,3,1,1,1,2,3,1,1,3,2});

        float barTotal = 0;
        foreach (int pw in pattern) barTotal += pw;

        float bw = w / barTotal;
        if (bw < 1) bw = 1;
        float cx = x;
        bool isBlack = true;

        foreach (int pw in pattern)
        {
            if (isBlack)
                g.FillRectangle(Brushes.Black, cx, y, pw * bw, h);
            cx += pw * bw;
            isBlack = !isBlack;
        }
    }

    public static void Print(string printerName, string mo, string lot)
    {
        PrintDocument pd = new PrintDocument();
        pd.PrinterSettings.PrinterName = printerName;
        pd.DefaultPageSettings.PaperSize = new PaperSize("76x100", 299, 394);
        pd.DefaultPageSettings.Margins = new Margins(15, 15, 10, 10);
        pd.PrintController = new StandardPrintController();

        bool printed = false;

        pd.PrintPage += delegate(object s, PrintPageEventArgs e)
        {
            if (printed) { e.HasMorePages = false; return; }
            printed = true;

            Graphics g = e.Graphics;
            float left = e.MarginBounds.Left;
            float top = e.MarginBounds.Top;
            float w = e.MarginBounds.Width;

            StringFormat sfC = new StringFormat();
            sfC.Alignment = StringAlignment.Center;

            // Title
            Font ft = new Font("Arial", 12, FontStyle.Bold);
            g.DrawString("BAR LABEL", ft, Brushes.Black,
                new RectangleF(left, top, w, ft.GetHeight(g)), sfC);
            ft.Dispose();

            // Column headers
            Font fh = new Font("Consolas", 8, FontStyle.Regular);
            g.DrawString("Nomor DO", fh, Brushes.Black, left, top + 35);
            g.DrawString("Nomor Lot", fh, Brushes.Black, left + 140, top + 35);
            fh.Dispose();

            // Values
            Font fv = new Font("Consolas", 8, FontStyle.Bold);
            g.DrawString(mo,  fv, Brushes.Black, left, top + 50);
            g.DrawString(lot, fv, Brushes.Black, left + 140, top + 50);
            fv.Dispose();

            // Separator
            g.DrawLine(Pens.Black, left, top + 72, left + w, top + 72);

            // Barcode bars
            DrawBarcode(g, left + 10, top + 88, w - 20, 36, lot);

            // Barcode label
            Font fb = new Font("Consolas", 8, FontStyle.Bold);
            g.DrawString(lot, fb, Brushes.Black,
                new RectangleF(left, top + 128, w, fb.GetHeight(g)), sfC);
            fb.Dispose();

            // Footer
            Font ff = new Font("Consolas", 6, FontStyle.Regular);
            g.DrawString(mo + "  |  " + lot, ff, Brushes.Black,
                new RectangleF(left, top + e.MarginBounds.Height - 15, w, ff.GetHeight(g)), sfC);
            ff.Dispose();

            e.HasMorePages = false;
        };

        pd.Print();
    }
}
"@
Add-Type -ReferencedAssemblies "System.Drawing.dll" -TypeDefinition $code
[LotLabel]::Print('${name}', '${mo}', '${lot}')
Write-Output "OK"
`;

      execFile(
        'powershell',
        ['-NoProfile', '-NonInteractive', '-Command', ps],
        { timeout: this._timeout, maxBuffer: 1024 * 1024 },
        (err, stdout, stderr) => {
          if (err) {
            if (err.killed || err.signal === 'SIGTERM')
              return reject(new PrinterTimeoutError('Print timeout after ' + this._timeout + 'ms'));
            return reject(new PrinterOfflineError('GDI print failed: ' + (stderr || err.message).trim()));
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
