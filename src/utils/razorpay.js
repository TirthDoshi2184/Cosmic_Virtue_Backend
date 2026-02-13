const Razorpay = require('razorpay');
const crypto  = require('crypto');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create a Razorpay order (amount in rupees, converts to paise internally)
const createRazorpayOrder = async (amount, receiptId) => {
  const order = await razorpay.orders.create({
    amount:   Math.round(amount * 100),  // paise
    currency: 'INR',
    receipt:  `rcpt_${receiptId}`,
    notes: {
      source: 'candle-website'
    }
  });
  return order;
};

// Verify payment signature (HMAC SHA256)
const verifyPaymentSignature = (razorpayOrderId, razorpayPaymentId, signature) => {
  const body     = razorpayOrderId + '|' + razorpayPaymentId;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expected === signature;
};

module.exports = { createRazorpayOrder, verifyPaymentSignature };