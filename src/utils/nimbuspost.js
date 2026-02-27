const axios = require('axios');

const BASE_URL = 'https://ship.nimbuspost.com/api';

const FormData = require('form-data');

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
const checkServiceability = async (deliveryPincode, isCOD = false) => {
  const form = new FormData();
  form.append('pickup_postcode', process.env.NIMBUS_SELLER_PINCODE);
  form.append('delivery_postcode', deliveryPincode);
  form.append('weight', 300);
  form.append('cod', isCOD ? 1 : 0);

  const res = await axios.post(`https://ship.nimbuspost.com/api/courier/serviceability`, form, {
    headers: {
      'NP-API-KEY': process.env.NIMBUS_API_KEY,
      ...form.getHeaders()
    }
  });

  return res.data;
};

// Create shipment after order is placed
const createShipment = async (order) => {
  const token = await getNimbusToken();
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

  const form = new FormData();

  // Core fields
  form.append('order_number',   order.orderNumber);
  form.append('payment_method', order.paymentMethod === 'cod' ? 'COD' : 'prepaid');
  form.append('amount',         Math.round(order.pricing.total));

  // Seller
  form.append('seller_name',    process.env.NIMBUS_SELLER_NAME);
  form.append('seller_address', process.env.NIMBUS_SELLER_ADDRESS);
  form.append('seller_city',    process.env.NIMBUS_SELLER_CITY);
  form.append('seller_state',   process.env.NIMBUS_SELLER_STATE);
  form.append('seller_pincode', parseInt(process.env.NIMBUS_SELLER_PINCODE));
  form.append('seller_phone',   parseInt(process.env.NIMBUS_SELLER_PHONE));

  // Buyer
  form.append('fname',   order.contactInfo.firstName);
  form.append('lname',   order.contactInfo.lastName);
  form.append('address', order.shippingAddress.address);
  form.append('phone',   parseInt(order.contactInfo.phone) || 9999999999);
  form.append('city',    order.shippingAddress.city);
  form.append('state',   order.shippingAddress.state);
  form.append('country', 'India');
  form.append('pincode', parseInt(order.shippingAddress.pincode));

  // Package (weight in grams as per docs)
  form.append('weight',  300);
  form.append('length',  15);
  form.append('breadth', 10);
  form.append('height',  10);

  // Products in PHP array format
  order.items.forEach((item, index) => {
    form.append(`products[${index}][name]`,  item.name);
    form.append(`products[${index}][qty]`,   item.quantity);
    form.append(`products[${index}][price]`, item.price);
  });

  console.log('Sending shipment for order:', order.orderNumber);

  try {
    const res = await axios.post('https://ship.nimbuspost.com/api/orders/create', form, {
      headers: {
        'NP-API-KEY': process.env.NIMBUS_API_KEY,
        ...form.getHeaders()
      }
    });
    console.log('✅ NimbusPost Success:', res.data);
    return res.data;
  } catch (error) {
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