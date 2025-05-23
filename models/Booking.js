// models/Booking.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema; // Define Schema from mongoose
const bookingSchema = new mongoose.Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Assuming you have a User model and reference it
    required: true,
  },
  stationId: {
    type: Schema.Types.ObjectId,
    ref:'station',
    required: true
  },
  latitude: { type: Number, required: true }, // Ensure this is required
  longitude: { type: Number, required: true }, // Ensure this is required
  stationName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: false
  },
  stationAdrres: {
    type: String,
    required: true
  },
  selectedDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: false
  },
  duration: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentId: {
    type: String,
    required: true
  },
  paymentStatus: {
    type: String,
    required: true
  },
   paymentIntentId: {
    type: String, // Added this line to store the paymentIntentId
    required: true
  },
  bookingId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'BOOK' + Math.floor(Math.random() * 1000000); // Generate a unique booking ID
    }
  }
}, { timestamps: true }); // This adds createdAt and updatedAt fields

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
