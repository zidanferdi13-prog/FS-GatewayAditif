const mqtt = require('mqtt');
const config = require('../config/config');

class MQTTClient {
  constructor(io) {
    this.io = io;
    this.client = null;
    this.connected = false;
    this.dataHistory = [];
    this.maxHistorySize = 100;
    
    // Load cell specific properties
    this.latestWeight = null;
    this.weightHistory = [];
    this.maxWeightHistory = 100;
    
    // Callbacks
    this.onWeightDataCallback = null;
    this.onConfirmCallback = null;
    
    // Topics
    this.topics = {
      telemetry: 'amanerve/loadcell/telemetry',
      button: 'amanerve/button/confirm',
      led: 'amanerve/led/status'
    };
    
    // Valid LED commands
    this.validLEDCommands = ['HIGH_GREEN', 'HIGH_RED', 'BLINK_GREEN', 'BLINK_RED'];
  }

  connect() {
    console.log(`🔌 Connecting to MQTT broker: ${config.mqtt.broker}`);
    
    this.client = mqtt.connect(config.mqtt.broker, {
      port: config.mqtt.port,
      clientId: config.mqtt.clientId,
      clean: true,
      reconnectPeriod: 1000,
    });

    this.client.on('connect', () => {
      console.log('✅ Connected to MQTT broker');
      this.connected = true;
      this.io.emit('mqtt-status', { connected: true });
      
      // Subscribe to main topic (backward compatibility)
      this.client.subscribe(config.mqtt.topic.data, (err) => {
        if (!err) {
          console.log(`📡 Subscribed to topic: ${config.mqtt.topic.data}`);
        } else {
          console.error('❌ Subscription error:', err);
        }
      });

      this.client.publish(config.mqtt.topic.status,
        JSON.stringify({ status: 'connected', timestamp: new Date().toISOString() }),
        { qos: 1, retain: true },
        (err) => {
          if (err) {
            console.error('❌ Failed to publish status:', err);
          } else {            
            console.log('📢 Published initial status message');
          }      
        }
      );
    });

    this.client.on('message', (topic, message) => {
      try {
        const rawMessage = message.toString();
        const timestamp = new Date().toISOString();
        
        // Route message based on topic
        if (topic === this.topics.telemetry) {
          // Handle load cell telemetry
          const payload = JSON.parse(rawMessage);
          this.handleWeightTelemetry(payload, timestamp);
        } else if (topic === this.topics.button) {
          // Handle confirm button
          const payload = JSON.parse(rawMessage);
          this.handleConfirmButton(payload, timestamp);
        } else {
          // Backward compatibility: handle generic topic
          let weight;
          try {
            const jsonData = JSON.parse(rawMessage);
            weight = parseFloat(jsonData.weight || jsonData.value || jsonData.kg || jsonData);
          } catch (e) {
            weight = parseFloat(rawMessage);
          }
          
          const data = {
            weight: weight,
            timestamp: timestamp
          };
          
          console.log('📊 Processed data:', data);
          
          // Store in history
          this.dataHistory.push(data);
          if (this.dataHistory.length > this.maxHistorySize) {
            this.dataHistory.shift();
          }
          
          // Emit to all connected clients
          this.io.emit('telemetry-data', data);
        }
      } catch (err) {
        console.error('❌ Error parsing message:', err);
      }
    });

    this.client.on('error', (err) => {
      console.error('❌ MQTT Error:', err);
      this.connected = false;
      this.io.emit('mqtt-status', { connected: false, error: err.message });
    });

    this.client.on('close', () => {
      console.log('⚠️ MQTT connection closed');
      this.connected = false;
      this.io.emit('mqtt-status', { connected: false });
    });

    this.client.on('offline', () => {
      console.log('⚠️ MQTT client offline');
      this.connected = false;
      this.io.emit('mqtt-status', { connected: false });
    });

    this.client.on('reconnect', () => {
      console.log('🔄 Reconnecting to MQTT broker...');
    });

  }

  // Load cell specific methods
  handleWeightTelemetry(payload, timestamp) {
    try {
      // Store payload to latestWeight with timestamp
      this.latestWeight = {
        ...payload,
        timestamp: timestamp
      };
      
      // Add to weightHistory array (FIFO, max 100 items)
      this.weightHistory.push(this.latestWeight);
      if (this.weightHistory.length > this.maxHistorySize) {
        this.weightHistory.shift();
      }
      
      // Log if stable
      if (payload.stable) {
        // console.log(`🔒 Weight LOCKED: ${payload.weight} kg`);
      }
      
      // Call onWeightDataCallback if registered
      if (this.onWeightDataCallback) {
        this.onWeightDataCallback(this.latestWeight);
      }
      
      // Emit Socket.IO event 'weightData' if io instance exists
      if (this.io) {
        this.io.emit('weightData', this.latestWeight);
      }
      
      // Store in general history for backward compatibility
      const data = {
        weight: payload.weight,
        timestamp: timestamp
      };
      this.dataHistory.push(data);
      if (this.dataHistory.length > this.maxHistorySize) {
        this.dataHistory.shift();
      }
      
      // Emit to all connected clients (backward compatibility)
      if (this.io) {
        this.io.emit('telemetry-data', data);
      }
    } catch (err) {
      console.error('❌ Error handling weight telemetry:', err);
    }
  }
  
  handleConfirmButton(payload, timestamp) {
    try {
      // Log confirmed weight
      console.log(`✅ CONFIRMED: ${payload.weight} kg`);
      
      // Automatically send HIGH_GREEN LED command
      this.sendLEDCommand('HIGH_GREEN');
      
      // Call onConfirmCallback if registered
      if (this.onConfirmCallback) {
        this.onConfirmCallback(payload);
      }
      
      // Emit Socket.IO event 'confirmData' if io instance exists
      if (this.io) {
        this.io.emit('confirmData', {
          ...payload,
          timestamp: timestamp
        });
      }
    } catch (err) {
      console.error('❌ Error handling confirm button:', err);
    }
  }
  
  sendLEDCommand(command) {
    try {
      // Validate command: HIGH_GREEN, HIGH_RED, BLINK_GREEN, BLINK_RED
      if (!this.validLEDCommands.includes(command)) {
        console.error(`❌ Invalid LED command: ${command}`);
        return false;
      }
      
      if (!this.client || !this.connected) {
        console.error('❌ MQTT client not connected');
        return false;
      }
      
      // Publish to topic: amanerve/led/status with QoS 1
      this.client.publish(this.topics.led, command, { qos: 1 }, (err) => {
        if (err) {
          console.error(`❌ Failed to send LED command: ${err.message}`);
        } else {
          // Log: console.log(`💡 LED command sent: ${command}`)
          console.log(`💡 LED command sent: ${command}`);
        }
      });
      
      // Return true on success, false on failure
      return true;
    } catch (err) {
      console.error('❌ Error sending LED command:', err);
      return false;
    }
  }

  getLatestWeight() {
    return this.latestWeight;
  }
  
  getWeightHistory(limit = 50) {
    const count = Math.min(limit, this.weightHistory.length);
    return this.weightHistory.slice(-count);
  }
  
  getStatistics() {
    // Return null if no data
    if (this.weightHistory.length === 0) {
      return null;
    }
    
    // Calculate from weightHistory: count, average, min, max, latest, stable
    const weights = this.weightHistory.map(item => item.weight);
    const sum = weights.reduce((acc, val) => acc + val, 0);
    const average = sum / weights.length;
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const latest = this.latestWeight;
    
    return {
      count: weights.length,
      average: parseFloat(average.toFixed(2)), // Round average to 2 decimals
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      latest: latest ? latest.weight : null,
      stable: latest ? latest.stable : false
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
  
  // Backward compatibility methods
  getHistory() {
    return this.dataHistory;
  }

  isConnected() {
    return this.connected;
  }

  disconnect() {
    if (this.client) {
      this.client.end();
    }
  }
}

module.exports = MQTTClient;
