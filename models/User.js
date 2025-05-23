const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  pushToken: { type: String, default: null },
  deviceInfo: {
    type: {
      deviceType: { type: String, enum: ['ios', 'android'], default: 'android' },
      isEmulator: { type: Boolean, default: false },
      deviceName: { type: String, default: 'unknown' },
      deviceId: { type: String },
      lastUpdated: { type: Date, default: Date.now }
    },
    default: {}
  }
}, { timestamps: true });
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', UserSchema);
