'use strict';

require('dotenv').config();

module.exports = {
  server: {
    port: parseInt(process.env.PORT, 10) || 3000
  },

  scales: {
    small: {
      port:     process.env.SERIAL_SMALL_PORT || process.env.SERIAL_PORT || 'COM1',
      baudRate: parseInt(process.env.SERIAL_SMALL_BAUD_RATE || process.env.SERIAL_BAUD_RATE || '9600', 10)
    },
    large: {
      port:     process.env.SERIAL_LARGE_PORT || 'COM2',
      baudRate: parseInt(process.env.SERIAL_LARGE_BAUD_RATE || process.env.SERIAL_BAUD_RATE || '9600', 10)
    }
  },

  loadcell: {
    max_weight:         parseFloat(process.env.MAX_WEIGHT)          || 100.0,
    overload_threshold: parseFloat(process.env.OVERLOAD_THRESHOLD)  || 90.0
  },

  database: {
    host:            process.env.DB_HOST            || 'localhost',
    user:            process.env.DB_USER            || 'root',
    password:        process.env.DB_PASSWORD        || '',
    name:            process.env.DB_NAME            || 'db_ama_premix',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10
  },

  api: {
    kanban: {
      baseUrl:         process.env.KANBAN_API_URL   || 'https://services.ama.id/kanban',
      findOneEndpoint: '/findOne'
    }
  },

  printer: {
    name:    process.env.PRINTER_NAME || 'XPrinter XP-420B',
    timeout: parseInt(process.env.PRINTER_TIMEOUT, 10) || 30000
  }
};
