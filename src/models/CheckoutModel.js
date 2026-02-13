const mongoose = require('mongoose');

const checkoutSchema = new mongoose.Schema({
  // Contact Information
  contactInfo: {
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
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    }
  },

  // Shipping Address
  shippingAddress: {
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
    }
  },

  // Billing Address
  billingAddress: {
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
    }
  },

  // Order Items
  // In the items array schema
items: [{
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false  // Make it optional for guest orders
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  image: {
    type: String
  },
  size: {
    type: String,
    default: 'Standard'
  }
}],
  // Payment Information
  paymentMethod: {
    type: String,
    enum: ['online', 'cod'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String
  },

  // Price Breakdown
  pricing: {
    subtotal: {
      type: Number,
      required: true
    },
    shipping: {
      type: Number,
      required: true
    },
    tax: {
      type: Number,
      required: true
    },
    total: {
      type: Number,
      required: true
    }
  },

  // Order Status
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },

  // User Reference (optional - for logged in users)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Email verified orders (for OTP-based checkout)
  emailVerified: {
    type: Boolean,
    default: false
  },

  // Order Notes
  notes: {
    type: String
  },

  // Tracking Information
  trackingNumber: {
    type: String
  },
  estimatedDelivery: {
    type: Date
  },

  nimbusAwb: {
  type: String         // AWB number from NimbusPost
},
nimbusCourier: {
  type: String         // Courier name assigned by NimbusPost
},
nimbusOrderId: {
  type: String         // NimbusPost's internal order ID
},

  // Timestamps
  orderDate: {
    type: Date,
    default: Date.now
  },
  
  deliveredAt: {
    type: Date
  }
}, {
  timestamps: true
}
);

// Index for faster queries
checkoutSchema.index({ 'contactInfo.phone': 1 });
checkoutSchema.index({ 'contactInfo.email': 1 });
checkoutSchema.index({ userId: 1 });
checkoutSchema.index({ orderStatus: 1 });

module.exports = mongoose.model('Checkout', checkoutSchema);