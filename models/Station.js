const mongoose = require('mongoose');

const chargingPointSchema = new mongoose.Schema({
  pointId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['AC', 'DC', 'Hybrid'],
    required: true
  },
  connectorType: {
    type: String,
    enum: ['CCS2', 'CHAdeMO', 'Type 2', 'GB/T'],
    required: true
  },
  power: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Available', 'Occupied', 'Maintenance', 'Offline'],
    default: 'Available'
  },
  inputVoltage: {
    type: String,
    required: true
  },
  maxCurrent: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  supportedVehicles: [{
    type: String,
    enum: ['Car', 'Bus', 'Truck', 'Three Wheeler']
  }]
});

const stationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  operationalStatus: {
    type: String,
    enum: ['Active', 'Maintenance', 'Offline', 'Coming Soon'],
    default: 'Active',
    required: true
  },
  operatingHours: {
    open: {
      type: String,
      required: true
    },
    close: {
      type: String,
      required: true
    }
  },
  chargingPoints: [chargingPointSchema],
  amenities: [{
    type: String,
    enum: ['Parking', 'Restroom', 'WiFi', 'Cafe', 'WaitingArea', 'Shopping', 'Security', 'AirFilling']
  }],
  location: {
    latitude: {
      type: String,
      required: true
    },
    longitude: {
      type: String,
      required: true
    }
  }
}, {
  timestamps: true
});

const Station = mongoose.model('Station', stationSchema);
module.exports = Station;