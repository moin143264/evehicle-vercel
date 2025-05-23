const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  stationName:{

    type: String,
    required: true
  },
  address:{

    type: String,
    required: true
  },
  latitude: { 
    type: Number, 
    required: true 
  },
  longitude: { 
    type: Number, 
    required: true 
  },
  userEmail: {
    type: String,
    required: true
  },
  stationId: {
    type: String,
    required: true
  },
  chargingPoint: {
    pointId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    power: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    connectorType: {
      type: String,
      required: true
    }
  },
  vehiclePlateNo: {
    type: String,
    required: true
  },
  bookingDate: {
    type: String,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentIntentId: {
    type: String,
    required: true,
    unique: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    default: 'stripe'
  },
  bookingStatus: {
    type: String,
    enum: ['confirmed', 'cancelled', 'completed'],
    default: 'confirmed'
  },
  refundStatus: {
    type: String,
    enum: ['none', 'pending', 'processed', 'failed'],
    default: 'none'
  },
  refundAmount: {
    type: Number
  },
  refundDate: {
    type: Date
  },
  bookingId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'BOOK' + Math.floor(Math.random() * 1000000); // Generate a unique booking ID
    }
  }
}, {
  timestamps: true
});

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ 'chargingPoint.pointId': 1 });
paymentSchema.index({ stationId: 1, bookingDate: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;