const { SerialPort } = require('serialport');
const config = require('../config/config');

class SerialService {
  constructor(io, scale = 'default', serialConfig = null) {
    this.io = io;
    this.scale = scale;
    this.serialConfig = serialConfig;
    this.port = null;
    this.connected = false;
    this._lineBuffer = '';

    // Weight data
    this.latestWeight = null;
    this.weightHistory = [];
    this.dataHistory = [];
    this.maxHistorySize = 100;
    this.maxWeightHistory = 100;

    // Callbacks
    this.onWeightDataCallback = null;
    this.onConfirmCallback = null;
  }

  connect() {
    const sourceConfig = this.serialConfig || config.serial;
    const portPath = sourceConfig.port;
    const baudRate = sourceConfig.baudRate;

    console.log(`🔌 [${this.scale}] Opening serial port: ${portPath} @ ${baudRate} bps`);

    try {
      this.port = new SerialPort({ path: portPath, baudRate: baudRate, autoOpen: false });

      this.port.open((err) => {
        if (err) {
          console.error(`❌ [${this.scale}] Failed to open serial port: ${err.message}`);
          this.connected = false;
          if (this.io) {
            const statusPayload = { scale: this.scale, connected: false, error: err.message };
            this.io.emit('serial-status', statusPayload);
            this.io.emit(`serial-status:${this.scale}`, statusPayload);
          }
          return;
        }

        console.log(`✅ [${this.scale}] Serial port opened: ${portPath}`);
        this.connected = true;
        if (this.io) {
          const statusPayload = { scale: this.scale, connected: true };
          this.io.emit('serial-status', statusPayload);
          this.io.emit(`serial-status:${this.scale}`, statusPayload);
        }
      });

      // Manual line buffer — splits on \r\n or \n
      this.port.on('data', (chunk) => {
        this._lineBuffer += chunk.toString();
        const lines = this._lineBuffer.split(/\r\n|\n/);
        this._lineBuffer = lines.pop(); // simpan sisa yang belum lengkap
        lines.forEach((line) => {
          const trimmed = line.trim();
          if (trimmed) this._handleLine(trimmed);
        });
      });

      this.port.on('error', (err) => {
        console.error(`❌ [${this.scale}] Serial port error: ${err.message}`);
        this.connected = false;
        if (this.io) {
          const statusPayload = { scale: this.scale, connected: false, error: err.message };
          this.io.emit('serial-status', statusPayload);
          this.io.emit(`serial-status:${this.scale}`, statusPayload);
        }
      });

      this.port.on('close', () => {
        console.log(`⚠️ [${this.scale}] Serial port closed`);
        this.connected = false;
        if (this.io) {
          const statusPayload = { scale: this.scale, connected: false };
          this.io.emit('serial-status', statusPayload);
          this.io.emit(`serial-status:${this.scale}`, statusPayload);
        }
      });

    } catch (err) {
      console.error(`❌ SerialPort init error: ${err.message}`);
    }
  }

  // Parse satu baris dari timbangan
  // Format: ST,GS,+   17.6   g  atau  US,GS,+    0.0   kg
  _handleLine(line) {
    // Regex: (ST|US) , <mode> , <sign> <spasi> <nilai> <spasi> <unit>
    const match = line.match(/^(ST|US),\w+,([+-])\s*([\d.]+)\s*(\w+)/);
    if (!match) return; // bukan baris data timbangan

    const status   = match[1];              // 'ST' atau 'US'
    const sign     = match[2];              // '+' atau '-'
    const rawValue = parseFloat(match[3]);  // nilai angka
    const unit     = match[4].toLowerCase(); // 'g' atau 'kg'

    // Normalisasi ke kg
    let weightKg = (unit === 'g') ? rawValue / 1000 : rawValue;
    if (sign === '-') weightKg = -weightKg;

    const stable    = (status === 'ST');
    const timestamp = new Date().toISOString();

    const payload = {
      scale:     this.scale,
      weight:    parseFloat(weightKg.toFixed(4)),
      stable:    stable,
      status:    status,
      unit:      unit,
      raw:       line,
      timestamp: timestamp
    };

    // Update latest & history
    this.latestWeight = payload;

    this.weightHistory.push(payload);
    if (this.weightHistory.length > this.maxWeightHistory) this.weightHistory.shift();

    const histData = { weight: payload.weight, timestamp };
    this.dataHistory.push(histData);
    if (this.dataHistory.length > this.maxHistorySize) this.dataHistory.shift();

    if (stable) {
      console.log(`🔒 [${this.scale}] STABLE: ${payload.weight} kg  (${rawValue} ${unit} raw)`);
    }

    // Kirim ke semua client via Socket.IO
    if (this.io) {
      this.io.emit('weightData', payload);
      this.io.emit(`weightData:${this.scale}`, payload);
      this.io.emit('telemetry-data', histData);
    }

    // Callback
    if (this.onWeightDataCallback) {
      this.onWeightDataCallback(payload);
    }
  }

  sendLEDCommand(command) {
    console.log(`💡 LED command: ${command}`);
    return false;
  }

  getLatestWeight() {
    return this.latestWeight;
  }

  getWeightHistory(limit = 50) {
    const count = Math.min(limit, this.weightHistory.length);
    return this.weightHistory.slice(-count);
  }

  getStatistics() {
    if (this.weightHistory.length === 0) return null;
    const weights = this.weightHistory.map(item => item.weight);
    const sum     = weights.reduce((acc, val) => acc + val, 0);
    const average = sum / weights.length;
    const min     = Math.min(...weights);
    const max     = Math.max(...weights);
    const latest  = this.latestWeight;
    return {
      count:   weights.length,
      average: parseFloat(average.toFixed(4)),
      min:     parseFloat(min.toFixed(4)),
      max:     parseFloat(max.toFixed(4)),
      latest:  latest ? latest.weight : null,
      stable:  latest ? latest.stable : false
    };
  }

  onWeightData(callback) {
    this.onWeightDataCallback = callback;
  }

  onConfirm(callback) {
    this.onConfirmCallback = callback;
  }

  setSocketIO(io) {
    this.io = io;
  }

  // Backward compat
  getHistory() {
    return this.dataHistory;
  }

  isConnected() {
    return this.connected;
  }

  disconnect() {
    if (this.port && this.port.isOpen) {
      this.port.close();
    }
  }
}

module.exports = SerialService;
