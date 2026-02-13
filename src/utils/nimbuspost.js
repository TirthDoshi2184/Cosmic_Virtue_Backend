const axios = require('axios');

const BASE_URL = 'https://api.nimbuspost.com/v1';

// Token cache to avoid re-generating on every request
let cachedToken = null;
let tokenExpiry = null;

const getNimbusToken = async () => {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const res = await axios.post(`${BASE_URL}/users/login`, {
    email: process.env.NIMBUS_EMAIL,
    password: process.env.NIMBUS_PASSWORD
  });

  if (!res.data.status) throw new Error('NimbusPost auth failed');

  // FIX: The token should be from res.data.data (which is likely a string token)
  // NOT from res.data itself
  cachedToken = res.data.data;
  
  // ADD: Log to verify token format
  console.log('Token received:', typeof cachedToken, cachedToken?.substring(0, 20) + '...');
  
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
  return cachedToken;
};
// Check if pincode is serviceable and get courier rates
const checkServiceability = async (pickupPincode, deliveryPincode, weight, isCOD = false) => {
  const token = await getNimbusToken();
  console.log(`Checking pickup for ${pickupPincode} (COD: ${isCOD})`);
  console.log(`Checking serviceability for ${deliveryPincode} (COD: ${isCOD})`);
  console.log('Token:', token ? '✅' : '❌');

  const res = await axios.post(`${BASE_URL}/courier/serviceability`, {
    pickup_postcode: pickupPincode,
    delivery_postcode: deliveryPincode,
    weight: weight,          // in kg (e.g., 0.5 for 500g)
    cod: isCOD ? 1 : 0
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.data;
};

// Create shipment after order is placed
const createShipment = async (order) => {
  // const token = await getNimbusToken();
  console.log(`Creating shipment for order ${order.orderNumber} (COD: ${order.paymentMethod === 'cod'})`);
  console.log('Token:', token ? '✅' : '❌');

  // ← ADD THIS BLOCK at the top
  // try {
  //   const walletRes = await axios.get(`${BASE_URL}/wallet/balance`, {
  //     headers: { Authorization: `Bearer ${token}` }
  //   });
  //   const balance = walletRes.data?.data?.balance || 0;
  //   console.log(`NimbusPost wallet balance: ₹${balance}`);

  //   if (balance < 100) {
  //     // Send alert email to yourself
  //     console.error(`🚨 CRITICAL: NimbusPost wallet low! Balance: ₹${balance}`);
  //     // You can call sendEmail() here to alert yourself
  //   }
  // } catch (walletErr) {
  //   console.error('Wallet check failed:', walletErr.message);
  //   // Continue anyway — don't block shipment for wallet check failure
  // }
  const payload = {
    order_number:       order.orderNumber,
    payment_type:       order.paymentMethod === 'cod' ? 'cod' : 'prepaid',
    package_weight:     0.5,        // kg — update per your candle product weight
    package_length:     15,         // cm
    package_breadth:    10,
    package_height:     10,
    sub_total:          order.pricing.subtotal,
    cod_amount:         order.paymentMethod === 'cod' ? order.pricing.total : 0,
    discount:           0,

    // Seller (your warehouse — from NimbusPost dashboard pickup address)
    seller_name:        process.env.NIMBUS_SELLER_NAME,
    seller_address:     process.env.NIMBUS_SELLER_ADDRESS,
    seller_city:        process.env.NIMBUS_SELLER_CITY,
    seller_state:       process.env.NIMBUS_SELLER_STATE,
    seller_pincode:     process.env.NIMBUS_SELLER_PINCODE,
    seller_phone:       process.env.NIMBUS_SELLER_PHONE,

    // Buyer (from order)
    shipping_customer_name:  `${order.contactInfo.firstName} ${order.contactInfo.lastName}`,
    shipping_phone:          order.contactInfo.phone,
    shipping_address:        order.shippingAddress.address,
    shipping_city:           order.shippingAddress.city,
    shipping_state:          order.shippingAddress.state,
    shipping_pincode:        order.shippingAddress.pincode,
    shipping_country:        'India',

    // Products
    order_items: order.items.map(item => ({
      name:     item.name,
      qty:      item.quantity,
      price:    item.price,
      sku:      item.productId?.toString() || 'CANDLE-SKU'
    })),

    // Let NimbusPost auto-assign best courier, or hardcode one from dashboard
    // courier_id: process.env.NIMBUS_DEFAULT_COURIER_ID || null
  };

    console.log('=== SHIPMENT DEBUG ===');
  console.log('Order Number:', payload.order_number);
  console.log('Payment Type:', payload.payment_type);
  console.log('Seller Pincode:', payload.seller_pincode);
  console.log('Shipping Pincode:', payload.shipping_pincode);
  console.log('COD Amount:', payload.cod_amount);
   console.log('Full Payload:', JSON.stringify(payload, null, 2));

  try {
    const res = await axios.post(`${BASE_URL}/orders/create`, payload, {
      headers: { Authorization: `Bearer ${process.env.NIMBUS_API_KEY}` }
    });
    return res.data;
  } catch (error) {
    // ADD THIS - see what NimbusPost actually says
    console.error('❌ NimbusPost API Error:');
    console.error('Status:', error.response?.status);
    console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
};
// Track a shipment by AWB number
const trackShipment = async (awbNumber) => {
  const token = await getNimbusToken();

  const res = await axios.get(`${BASE_URL}/courier/track-awb/${awbNumber}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.data;
};

// Cancel a shipment by AWB
const cancelShipment = async (awbNumber) => {
  const token = await getNimbusToken();

  const res = await axios.post(`${BASE_URL}/orders/cancel`, {
    awb_numbers: [awbNumber]
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.data;
};

const checkWalletBalance = async () => {
  const token = await getNimbusToken();
  const res = await axios.get(`${BASE_URL}/wallet/balance`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

module.exports = {
  getNimbusToken,
  checkServiceability,
  createShipment,
  trackShipment,
  cancelShipment,
  checkWalletBalance   // ADD THIS
};