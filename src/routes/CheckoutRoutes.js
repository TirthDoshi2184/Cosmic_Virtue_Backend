const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/CheckoutController');

// ============================================
// OTP ROUTES (Public - No Auth Required)
// ============================================
router.post('/auth/send-otp', checkoutController.sendOTP);
router.post('/auth/verify-otp', checkoutController.verifyOTP);

// ============================================
// ADDRESS ROUTES (Public - Email Based)
// ============================================
router.post('/addresses', checkoutController.saveAddress);
router.get('/addresses/by-email/:email', checkoutController.getAddressesByEmail);
router.delete('/addresses/:addressId', checkoutController.deleteAddress);

// ============================================
// ORDER ROUTES (Public - Phone or User Based)
// ============================================
router.post('/orders', checkoutController.placeOrder);
router.get('/orders/:orderId', checkoutController.getOrderById);
router.get('/orders/email/:email', checkoutController.getOrdersByEmail);
router.get('/orders/user/:userId', checkoutController.getOrdersByUserId);

// ============================================
// ADMIN ROUTES (Should be protected in future)
// ============================================
router.patch('/orders/:orderId/status', checkoutController.updateOrderStatus);
router.patch('/orders/:orderId/cancel', checkoutController.cancelOrder);

// ADD these 2 routes under ORDER ROUTES
router.post('/payment/create-order',  checkoutController.createPaymentOrder);
router.post('/payment/verify',        checkoutController.verifyAndConfirmPayment);

// ADD at the bottom — no auth needed, NimbusPost calls this
router.post('/webhooks/nimbuspost', checkoutController.nimbusWebhook);

// ADD this new route (place it under ORDER ROUTES)
router.get('/orders/:orderId/track', async (req, res) => {
  try {
    const { trackShipment } = require('../utils/nimbuspost');
    const Checkout = require('../models/CheckoutModel');

    const order = await Checkout.findById(req.params.orderId);
    if (!order || !order.nimbusAwb) {
      return res.status(404).json({ success: false, message: 'Tracking not available yet' });
    }

    const trackingData = await trackShipment(order.nimbusAwb);

    res.status(200).json({
      success:    true,
      awb:        order.nimbusAwb,
      courier:    order.nimbusCourier,
      tracking:   trackingData
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin use only — add auth middleware before going live
router.get('/admin/wallet-balance', async (req, res) => {
  const { checkWalletBalance } = require('../utils/nimbuspost');
  const balance = await checkWalletBalance();
  res.json({ success: true, data: balance });
});


router.get('/serviceability/:pincode', (req, res) => {
  req.query.pincode = req.params.pincode;
  checkoutController.checkServiceability(req, res);
});
module.exports = router;