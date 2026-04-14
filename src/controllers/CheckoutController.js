  const Checkout = require('../models/CheckoutModel');
  const Address = require('../models/AddressModel');
  // const OTP = require('../models/OtpModel');
  // ADD this line after your existing requires
  // const { createShipment, trackShipment, cancelShipment,checkServiceability } = require('../utils/nimbuspost');
  const { createShipment, trackShipment, cancelShipment, checkServiceability } = require('../utils/shiprocket');
  const { createRazorpayOrder, verifyPaymentSignature } = require('../utils/razorpay');
  const Cart = require('../models/CartModel');
  const { sendEmai, sendOrderConfirmationEmail, sendOrderConfirmationSMS,sendEmailSafe } = require('../utils/email');
const { default: axios } = require('axios');
const { verifyFirebaseToken } = require('../utils/firebaseAdmin');
  // ============================================
  // OTP FUNCTIONS
  // ============================================

  // Send OTP
  // CHANGE: sendOTP function
//   exports.sendOTP = async (req, res) => {
//   const { phone } = req.body;

//   if (!phone || !/^[0-9]{10}$/.test(phone)) {
//     return res.status(400).json({ success: false, message: 'Invalid phone number' });
//   }

//   if (process.env.SKIP_OTP === 'true') {
//     return res.status(200).json({ success: true, message: 'OTP skipped (dev mode)' });
//   }

//   try {
//     await OTP.deleteMany({ phone });

//     await sendOTPviaMSG91(phone);  // will now throw if MSG91 fails

//     await OTP.create({
//       phone,
//       otp: 'MSG91',
//       expiresAt: new Date(Date.now() + 5 * 60 * 1000)
//     });

//     res.status(200).json({ success: true, message: 'OTP sent to your phone' });

//   } catch (error) {
//     console.error('MSG91 sendOTP failed:', error.message);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to send OTP. Please try again.',
//       error: error.message   // remove this line in production
//     });
//   }
// };
exports.sendOTP = async (req, res) => {
  // Firebase handles OTP sending on the frontend directly
  // This endpoint is no longer needed but kept for route compatibility
  res.status(200).json({ 
    success: true, 
    message: 'Use Firebase on frontend to send OTP' 
  });
};

exports.verifyOTP = async (req, res) => {
  const { phone, firebaseToken } = req.body;

  if (process.env.SKIP_OTP === 'true') {
    return res.status(200).json({ success: true, message: 'OTP verification skipped' });
  }

  if (!phone || !firebaseToken) {
    return res.status(400).json({ success: false, message: 'Phone and token are required' });
  }

  try {
    const decoded = await verifyFirebaseToken(firebaseToken);

    // Make sure the token belongs to this phone number
    const tokenPhone = decoded.phone_number; // e.g. '+919876543210'
    const expectedPhone = `+91${phone}`;

    if (tokenPhone !== expectedPhone) {
      return res.status(400).json({ success: false, message: 'Phone number mismatch' });
    }

    // OTP is valid — no need to store anything in MongoDB
    res.status(200).json({ success: true, message: 'Phone verified successfully' });

  } catch (error) {
    console.error('Firebase token verification failed:', error.message);
    res.status(400).json({ success: false, message: 'Invalid or expired verification. Please retry.' });
  }
};
  // CHANGE: verifyOTP function
//   exports.verifyOTP = async (req, res) => {
//   const { phone, otp } = req.body;

//   if (process.env.SKIP_OTP === 'true') {
//     return res.status(200).json({ success: true, message: 'OTP verification skipped' });
//   }

//   // Check OTP was actually sent
//   const record = await OTP.findOne({ phone });
//   if (!record) {
//     return res.status(400).json({ success: false, message: 'Please request OTP first' });
//   }

//   if (record.expiresAt < new Date()) {
//     await OTP.deleteMany({ phone });
//     return res.status(400).json({ success: false, message: 'OTP expired' });
//   }

//   // Verify via MSG91
//   const result = await verifyOTPviaMSG91(phone, otp);

//   if (result.type !== 'success') {
//     return res.status(400).json({ success: false, message: 'Invalid OTP' });
//   }

//   await OTP.deleteMany({ phone });

//   res.status(200).json({ success: true, message: 'Phone verified successfully' });
// };
  // Verify OTP
  // exports.verifyOTP = async (req, res) => {
  //   try {
  //     const { phone, otp } = req.body;

  //     if (!phone || !otp) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Phone and OTP are required'
  //       });
  //     }

  //     // Find OTP record
  //     const otpRecord = await OTP.findOne({ 
  //       phone, 
  //       otp,
  //       verified: false
  //     });

  //     if (!otpRecord) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Invalid OTP'
  //       });
  //     }

  //     // Check if OTP is expired
  //     if (new Date() > otpRecord.expiresAt) {
  //       await OTP.deleteOne({ _id: otpRecord._id });
  //       return res.status(400).json({
  //         success: false,
  //         message: 'OTP has expired. Please request a new one.'
  //       });
  //     }

  //     // Mark OTP as verified
  //     otpRecord.verified = true;
  //     await otpRecord.save();

  //     // Delete OTP after verification
  //     await OTP.deleteOne({ _id: otpRecord._id });

  //     res.status(200).json({
  //       success: true,
  //       message: 'Phone verified successfully'
  //     });

  //   } catch (error) {
  //     console.error('Error verifying OTP:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to verify OTP',
  //       error: error.message
  //     });
  //   }
  // };

  // exports.verifyOTP = async (req, res) => {
  //   try {
  //     const { email, otp } = req.body;

  //     // ⭐ DEV BYPASS
  //     if (process.env.SKIP_OTP === 'true') {
  //       return res.status(200).json({
  //         success: true,
  //         message: 'OTP verification skipped (development mode)',
  //         token: generateJWT(email) // or your login logic
  //       });
  //     }

  //     // -------- NORMAL FLOW --------
  //     const record = await OTP.findOne({ email, otp });

  //     if (!record) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Invalid OTP'
  //       });
  //     }

  //     if (record.expiresAt < new Date()) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'OTP expired'
  //       });
  //     }

  //     await OTP.deleteMany({ email });

  //     const token = generateJWT(email);

  //     res.status(200).json({
  //       success: true,
  //       token
  //     });

  //   } catch (error) {
  //     res.status(500).json({ success: false });
  //   }
  // };

  // ============================================
  // ADDRESS FUNCTIONS
  // ============================================

  // Save Address
  exports.saveAddress = async (req, res) => {
    try {
      const {
          email,
        phone,
        firstName,
        lastName,
        address,
        apartment,
        city,
        state,
        pincode,
        country,
        landmark,
        addressType,
        isDefault,
        userId
      } = req.body;

      // Validate required fields
      if (!phone || !firstName || !lastName || !address || !city || !state || !pincode) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing'
        });
      }

      // If this is set as default, unset other default addresses for this phone
      if (isDefault) {
        await Address.updateMany(
          { phone }, // CHANGED: email → phone
          { isDefault: false }
        );
      }

      // Create new address
      const newAddress = await Address.create({
        email,
        phone,
        firstName,
        lastName,
        address,
        apartment,
        city,
        state,
        pincode,
        country: country || 'India',
        landmark,
        addressType: addressType || 'home',
        isDefault: isDefault || false,
        userId: userId || null
      });

      res.status(201).json({
        success: true,
        message: 'Address saved successfully',
        data: newAddress
      });

    } catch (error) {
      console.error('Error saving address:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save address',
        error: error.message
      });
    }
  };

  // Get Addresses by Phone
  exports.getAddressesByPhone = async (req, res) => {
    try {
      const { phone } = req.params;

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone is required'
        });
      }

      const addresses = await Address.find({ phone})
        .sort({ isDefault: -1, createdAt: -1 });

      res.status(200).json({
        success: true,
        count: addresses.length,
        data: addresses
      });

    } catch (error) {
      console.error('Error fetching addresses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch addresses',
        error: error.message
      });
    }
  };

  // Delete Address
  exports.deleteAddress = async (req, res) => {
    try {
      const { addressId } = req.params;

      const address = await Address.findByIdAndDelete(addressId);

      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Address deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting address:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete address',
        error: error.message
      });
    }
  };

  // ============================================
  // CHECKOUT/ORDER FUNCTIONS
  // ============================================

  // Place Order
  exports.placeOrder = async (req, res) => {
    try {
      const {
        contactInfo,
        shippingAddress,
        billingAddress,
        items,
        paymentMethod,
        pricing,
        phoneVerified,
        userId
      } = req.body;

      // Validate required fields
      if (!contactInfo || !shippingAddress || !items || !items.length || !paymentMethod || !pricing) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing'
        });
      }

      // Validate phone verification for non-logged in users
      if (!userId && !phoneVerified) {
        return res.status(400).json({
          success: false,
          message: 'Phone verification required'
        });
      }

      // Transform items to ensure proper format
      const formattedItems = items.map(item => ({
        productId: item.productId || item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
         image: Array.isArray(item.image) ? item.image[0] : item.image, 
        size: item.size || 'Standard'
      }));

      // Create order
      const order = await Checkout.create({
        contactInfo,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        items: formattedItems,
        paymentMethod,
        pricing,
        phoneVerified: phoneVerified || false,
        userId: userId || null,
        orderStatus: 'pending',
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending'
      });

      // If user is logged in, clear their cart from database
      if (userId) {
        try {
          await Cart.findOneAndUpdate(
            { userId },
            { $set: { items: [] } }
          );
        } catch (cartError) {
          console.error('Error clearing cart:', cartError);
          // Continue even if cart clearing fails
        }
      }

      // Generate order number
      // Generate order number
  const orderNumber = order._id.toString().slice(-8).toUpperCase();

      // Clear cart if logged in
      if (userId) {
        try {
          await Cart.findOneAndUpdate(
            { userId },
            { $set: { items: [] } }
          );
        } catch (cartError) {
          console.error('Error clearing cart:', cartError);
        }
      }

      // Send order confirmation email
      try {
        await sendOrderConfirmationEmail(
          contactInfo.email,
          orderNumber,
          pricing.total,
          order
        );
      } catch (error) {
        console.error('Email failed:', error);
      }

      // Create shipment ONLY for COD (online payment creates shipment after verification)
      if (paymentMethod === 'cod') {
        try {
          const orderWithNumber = { ...order.toObject(), orderNumber };
          const nimbusData = await createShipment(orderWithNumber);
          
          if (nimbusData?.payload) {
order.srOrderId = nimbusData.payload.order_id?.toString() || null;
order.srAwb = nimbusData.payload.awb_code || null;
order.srCourier = nimbusData.payload.courier_name || null;
order.trackingNumber = nimbusData.payload.awb_code || null;
  order.orderStatus = 'confirmed';
  await order.save();
}
        } catch (nimbusError) {
          console.error('NimbusPost COD shipment failed:', nimbusError.message);
        }
      }

      res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        data: {
          orderId: order._id,
          orderNumber: orderNumber,
          orderStatus: order.orderStatus,
          paymentMethod: order.paymentMethod,
          total: order.pricing.total,
       tracking: { awb: order.srAwb || null, courier: order.srCourier || null }
        }
      });

    } catch (error) {
      console.error('Error placing order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to place order',
        error: error.message
      });
    }
  };
  // Get Order by ID
  exports.getOrderById = async (req, res) => {
    try {
      const { orderId } = req.params;

      const order = await Checkout.findById(orderId)
        .populate('items.productId', 'name price img');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.status(200).json({
        success: true,
        data: order
      });

    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch order',
        error: error.message
      });
    }
  };

  // CHANGE: getOrdersByEmail (rename from getOrdersByPhone)
  exports.getOrdersByPhone = async (req, res) => {
    const { phone } = req.params; // CHANGED

    const orders = await Checkout.find({ 
      'contactInfo.phone': phone // CHANGED
    })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
      });
  };

  // Get Orders by User ID
  exports.getOrdersByUserId = async (req, res) => {
    try {
      const { userId } = req.params;

      const orders = await Checkout.find({ userId })
        .sort({ createdAt: -1 })
        .populate('items.productId', 'name price img');

      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
      });

    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch orders',
        error: error.message
      });
    }
  };

  // Update Order Status
  exports.updateOrderStatus = async (req, res) => {
    try {
      const { orderId } = req.params;
      const { orderStatus, trackingNumber, estimatedDelivery } = req.body;

      const order = await Checkout.findById(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (orderStatus) order.orderStatus = orderStatus;
      if (trackingNumber) order.trackingNumber = trackingNumber;
      if (estimatedDelivery) order.estimatedDelivery = estimatedDelivery;

      if (orderStatus === 'delivered') {
        order.deliveredAt = new Date();
      }

      await order.save();

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: order
      });

    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order status',
        error: error.message
      });
    }
  };

  // Cancel Order
  exports.cancelOrder = async (req, res) => {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;

      const order = await Checkout.findById(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if order can be cancelled
      if (['shipped', 'delivered'].includes(order.orderStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Order cannot be cancelled at this stage'
        });
      }

      order.orderStatus = 'cancelled';
      order.notes = reason || 'Cancelled by customer';
      await order.save();

      // ADD: Cancel on NimbusPost if AWB exists
  if (order.srOrderId) {
    try {
      await cancelShipment(order.srOrderId);
    } catch (err) {
      console.error('NimbusPost cancel failed:', err.message);
    }
  }

      // Send cancellation SMS
      try {
        const orderNumber = order._id.toString().slice(-8).toUpperCase();
        await sendOrderStatusSMS(
          order.contactInfo.phone,
          orderNumber,
          'cancelled'
        );
      } catch (smsError) {
        console.error('Failed to send cancellation SMS:', smsError);
      }

      // TODO: Process refund if payment was completed

      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: order
      });

    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel order',
        error: error.message
      });
    }
  };

  // ============================================
  // RAZORPAY - CREATE PAYMENT ORDER
  // ============================================
  exports.createPaymentOrder = async (req, res) => {
    try {
      const { amount, orderId } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }

      const razorpayOrder = await createRazorpayOrder(amount, orderId || Date.now());

      res.status(200).json({
        success: true,
        data: {
          razorpayOrderId: razorpayOrder.id,
          amount:          razorpayOrder.amount,   // in paise
          currency:        razorpayOrder.currency,
          keyId:           process.env.RAZORPAY_KEY_ID
        }
      });

    } catch (error) {
      console.error('Razorpay order creation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Payment initialization failed',
        error:   error.message
      });
    }
  };

  // ============================================
  // RAZORPAY - VERIFY PAYMENT & CONFIRM ORDER
  // ============================================
  exports.verifyAndConfirmPayment = async (req, res) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        orderId              // your MongoDB order _id
      } = req.body;

      // Step 1: Verify signature
      const isValid = verifyPaymentSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!isValid) {
        // Mark order as payment failed
        await Checkout.findByIdAndUpdate(orderId, {
          paymentStatus: 'failed',
          orderStatus:   'pending'
        });

        return res.status(400).json({
          success: false,
          message: 'Payment verification failed. Please contact support.'
        });
      }

      // Step 2: Update order with payment details
      const order = await Checkout.findByIdAndUpdate(
        orderId,
        {
          paymentStatus: 'completed',
          transactionId: razorpay_payment_id,
          orderStatus:   'confirmed'
        },
        { new: true }
      );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Step 3: Now create NimbusPost shipment (only after payment confirmed)
      try {
        const orderNumber = order._id.toString().slice(-8).toUpperCase();
        const nimbusData  = await createShipment({ ...order.toObject(), orderNumber });
if (nimbusData?.payload) {
order.srOrderId = nimbusData.payload.order_id?.toString() || null;
order.srAwb = nimbusData.payload.awb_code || null;
order.srCourier = nimbusData.payload.courier_name || null;
order.trackingNumber = nimbusData.payload.awb_code || null;
  order.orderStatus = 'confirmed';
  await order.save();
}
      } catch (nimbusError) {
        console.error('NimbusPost failed after payment:', nimbusError.message);
        // Don't fail — payment is done, just retry shipment manually
      }

      res.status(200).json({
        success: true,
        message: 'Payment verified and order confirmed',
        data: {
          orderId:       order._id,
          orderNumber:   order._id.toString().slice(-8).toUpperCase(),
          paymentStatus: order.paymentStatus,
          orderStatus:   order.orderStatus,
       tracking: { awb: order.srAwb || null, courier: order.srCourier || null }
        }
      });

    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Payment verification failed',
        error:   error.message
      });
    }
  };


  exports.nimbusWebhook = async (req, res) => {
    try {
      console.log('Full webhook body:', JSON.stringify(req.body, null, 2));
      const { awb_number, current_status, location, timestamp } = req.body;

      console.log('NimbusPost Webhook:', { awb_number, current_status });

      // Map NimbusPost statuses to your order statuses
      const statusMap = {
        'Booked':              'confirmed',
        'In Transit':          'shipped',
        'Out for Delivery':    'shipped',
        'Delivered':           'delivered',
        'Failed Delivery':     'shipped',     // still active, retry
        'RTO Initiated':       'cancelled',
        'RTO Delivered':       'cancelled',
        'Cancelled':           'cancelled',
        'Pickup Pending':      'confirmed',
        'Pickup Scheduled':    'confirmed',
        'Picked Up':           'processing'
      };

      if (!awb_number) {
        return res.status(200).json({ success: true }); // always 200 to NimbusPost
      }

      const mappedStatus = statusMap[current_status];

      if (mappedStatus) {
const order = await Checkout.findOne({ 
  $or: [
    { nimbusAwb: awb_number },
    { nimbusOrderId: req.body.order_id?.toString() }
  ]
});
        if (order) {
          order.orderStatus = mappedStatus;
          if (awb_number) {
  order.nimbusAwb = awb_number;
  order.trackingNumber = awb_number;
}
if (req.body.courier_name) {
  order.nimbusCourier = req.body.courier_name;
}

          if (mappedStatus === 'delivered') {
            order.deliveredAt    = timestamp ? new Date(timestamp) : new Date();
            order.paymentStatus  = 'completed'; // auto-complete COD on delivery
          }

          await order.save();

          // Send delivery email to customer
          if (mappedStatus === 'delivered') {
            try {
              const orderNumber = order._id.toString().slice(-8).toUpperCase();
              await sendEmailSafe(
                order.contactInfo.email,
                `Your Order #${orderNumber} has been Delivered! 🎉`,
                `Hi ${order.contactInfo.firstName}, your order has been delivered. Thank you for shopping with us!`
              );
            } catch (emailErr) {
              console.error('Delivery email failed:', emailErr);
            }
          }
        }
      }

      // Always respond 200 — NimbusPost retries if it gets anything else
      res.status(200).json({ success: true });

    } catch (error) {
      console.error('Webhook error:', error);
      res.status(200).json({ success: true }); // still 200 to prevent retries
    }
  };
exports.checkServiceability = async (req, res) => {
  try {
    const { pincode } = req.params;

    if (!/^[0-9]{6}$/.test(pincode)) {
      return res.json({ success: false, serviceable: false, shippingCharge: 0 });
    }

    // Simple local fallback while Shiprocket serviceability is checked
    const pincodeNum = parseInt(pincode);
    const isGujarat = pincodeNum >= 360000 && pincodeNum <= 396999;
    const shippingCharge = isGujarat ? 90 : 120;

    // Block known unserviceable remote areas
    const unserviceablePrefixes = ['744', '793', '795', '796', '797', '798'];
    const isUnserviceable = unserviceablePrefixes.some(prefix => pincode.startsWith(prefix));

    if (isUnserviceable) {
      return res.json({ success: true, serviceable: false, shippingCharge: 0 });
    }

    // Optional: call Shiprocket's serviceability API for real-time check
    // Uncomment if you want live courier availability check:
    // const srData = await checkServiceability(pincode, false);
    // const available = srData?.data?.available_courier_companies?.length > 0;
    // if (!available) return res.json({ success: true, serviceable: false, shippingCharge: 0 });

    res.json({ success: true, serviceable: true, shippingCharge, zone: isGujarat ? 'local' : 'national' });
  } catch (err) {
    console.error('Serviceability error:', err.message);
    res.json({ success: true, serviceable: true, shippingCharge: 90 });
  }
};

exports.shiprocketWebhook = async (req, res) => {
  try {
    console.log('Shiprocket Webhook:', JSON.stringify(req.body, null, 2));

    const { awb, current_status, order_id } = req.body;

    const statusMap = {
      'Pickup Scheduled': 'confirmed',
      'Picked Up': 'processing',
      'In Transit': 'shipped',
      'Out For Delivery': 'shipped',
      'Delivered': 'delivered',
      'Cancelled': 'cancelled',
      'RTO Initiated': 'cancelled',
      'RTO Delivered': 'cancelled',
      'Undelivered': 'shipped',
    };

    const mappedStatus = statusMap[current_status];

    if (mappedStatus && (awb || order_id)) {
      const order = await Checkout.findOne({
        $or: [
          { srAwb: awb },
          { srOrderId: order_id?.toString() }
        ]
      });

      if (order) {
        order.orderStatus = mappedStatus;
        if (awb) { order.srAwb = awb; order.trackingNumber = awb; }

        if (mappedStatus === 'delivered') {
          order.deliveredAt = new Date();
          order.paymentStatus = 'completed';
        }

        await order.save();

        if (mappedStatus === 'delivered') {
          try {
            const orderNumber = order._id.toString().slice(-8).toUpperCase();
            await sendEmailSafe(
              order.contactInfo.email,
              `Your Order #${orderNumber} has been Delivered! 🎉`,
              `Hi ${order.contactInfo.firstName}, your order has been delivered. Thank you!`
            );
          } catch (e) { console.error('Delivery email failed:', e); }
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).json({ success: true }); // always 200 to prevent retries
  }
};