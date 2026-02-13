const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  // User identification (phone-based)
  phone: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  // Optional user ID for logged-in users
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Contact Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },

  // Address Details
  address: {
    type: String,
    required: true,
    trim: true
  },
  apartment: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  pincode: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    default: 'India'
  },
  landmark: {
    type: String,
    trim: true
  },

  // Address Type
  addressType: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },

  // Default address flag
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for phone-based queries
addressSchema.index({ phone: 1, createdAt: -1 });

module.exports = mongoose.model('Address', addressSchema);