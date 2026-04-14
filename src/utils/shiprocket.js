const axios = require('axios');

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

// Token cache — valid for 10 days (240 hrs), refresh every 9 days to be safe
let cachedToken = null;
let tokenExpiry = null;

const getShiprocketToken = async () => {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const res = await axios.post(`${BASE_URL}/auth/login`, {
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  });

  if (!res.data.token) throw new Error('Shiprocket auth failed');

  cachedToken = res.data.token;
  tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000; // refresh every 9 days
  console.log('Shiprocket token refreshed ✅');
  return cachedToken;
};

// Check serviceability and get shipping charge
const checkServiceability = async (deliveryPincode, isCOD = false) => {
  const token = await getShiprocketToken();

  const res = await axios.get(`${BASE_URL}/courier/serviceability/`, {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      pickup_postcode: process.env.SHIPROCKET_SELLER_PINCODE,
      delivery_postcode: deliveryPincode,
      weight: 0.3,       // 300g in kg
      cod: isCOD ? 1 : 0,
    },
  });

  return res.data;
};

// Create order + shipment in Shiprocket
const createShipment = async (order) => {
  const token = await getShiprocketToken();
console.log('PICKUP LOCATION:', process.env.SHIPROCKET_PICKUP_LOCATION); // add this
  console.log(`Creating Shiprocket shipment for order ${order.orderNumber}`);

  const isCOD = order.paymentMethod === 'cod';

  const orderPayload = {
    order_id: order.orderNumber,
    order_date: new Date().toISOString().replace('T', ' ').slice(0, 16),
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
    billing_customer_name: order.contactInfo.firstName,
    billing_last_name: order.contactInfo.lastName,
    billing_address: order.shippingAddress.address,
    billing_address_2: order.shippingAddress.apartment || '',
    billing_city: order.shippingAddress.city,
    billing_pincode: parseInt(order.shippingAddress.pincode),
    billing_state: order.shippingAddress.state,
    billing_country: 'India',
    billing_email: order.contactInfo.email,
    billing_phone: parseInt(order.contactInfo.phone),

    // Shipping same as billing unless different
    shipping_is_billing: true,

    payment_method: isCOD ? 'COD' : 'Prepaid',
    sub_total: Math.round(order.pricing.subtotal),
    length: 15,
    breadth: 10,
    height: 10,
    weight: 0.3, // kg

    order_items: order.items.map((item) => ({
      name: item.name,
      sku: item.productId?.toString() || `SKU-${Date.now()}`,
      units: item.quantity,
      selling_price: item.price,
    })),
  };

  try {
    const res = await axios.post(`${BASE_URL}/orders/create/adhoc`, orderPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Shiprocket order created:', res.data);
    return res.data;
  } catch (error) {
    console.error('❌ Shiprocket API Error:');
    console.error('Status:', error.response?.status);
    console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
};

// Track shipment by AWB or Shiprocket order ID
const trackShipment = async (shiprocketOrderId) => {
  const token = await getShiprocketToken();

  const res = await axios.get(`${BASE_URL}/courier/track`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { order_id: shiprocketOrderId },
  });

  return res.data;
};

// Cancel order
const cancelShipment = async (shiprocketOrderIds) => {
  const token = await getShiprocketToken();

  const res = await axios.post(
    `${BASE_URL}/orders/cancel`,
    { ids: Array.isArray(shiprocketOrderIds) ? shiprocketOrderIds : [shiprocketOrderIds] },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );

  return res.data;
};

module.exports = {
  getShiprocketToken,
  checkServiceability,
  createShipment,
  trackShipment,
  cancelShipment,
};