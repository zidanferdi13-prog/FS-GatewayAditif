'use strict';

const { default: mqtt } = require('mqtt');

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
    name:            process.env.DB_NAME            || 'amanerve_loadcell',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10
  },

  api: {
    kanban: {
      baseUrl:         process.env.KANBAN_API_URL   || 'https://services.ama.id/kanban',
      findOneEndpoint: '/findOne'
    }
  },

  mqtt: {
    broker:   process.env.MQTT_BROKER   || 'mqtt://localhost',
    port:     parseInt(process.env.MQTT_PORT, 10) || 1883,
    clientId: process.env.MQTT_CLIENT_ID || `mqtt_client_${Math.random().toString(16).substr(2, 8)}`,
    topic: {
      status: 'WAN/FACTORY/PREMIX/TABLET/STATUS',
      data:   'WAN/FACTORY/PREMIX/TABLET/DATA'
    }
  }
};

