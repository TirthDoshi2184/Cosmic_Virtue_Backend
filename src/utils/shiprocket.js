const axios = require('axios');

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

// Token cache — valid for 10 days (240 hrs), refresh every 9 days to be safe
let cachedToken = null;
let tokenExpiry = null;

/**
 * Verifies the X-Shiprocket-Signature header.
 */
const verifyWebhookSignature = (req) => {
  const token = req.headers['x-api-key'];
  const expected = process.env.SHIPROCKET_WEBHOOK_SECRET;

  if (!expected) {
    console.warn('SHIPROCKET_WEBHOOK_SECRET not set — skipping verification');
    return true;
  }

  return token === expected;
};

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
  tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000;
  console.log('Shiprocket token refreshed ✅');
  return cachedToken;
};

// Check serviceability and get shipping charge + courier list
// Returns the raw Shiprocket response so callers can access
// res.data.data.available_courier_companies for a courier picker UI
const checkServiceability = async (deliveryPincode, isCOD = false, weightKg = 0.3) => {
  const token = await getShiprocketToken();

  const res = await axios.get(`${BASE_URL}/courier/serviceability/`, {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      pickup_postcode: process.env.SHIPROCKET_SELLER_PINCODE,
      delivery_postcode: deliveryPincode,
      weight: weightKg,
      cod: isCOD ? 1 : 0,
    },
  });

  return res.data;
};

// Create order + shipment in Shiprocket
const createShipment = async (order) => {
  const token = await getShiprocketToken();
  console.log(`Creating Shiprocket shipment for order ${order.orderNumber}`);

  const isCOD = order.paymentMethod === 'cod';

  // Calculate real shipment weight from actual product weights (grams),
  // plus a packaging buffer for the extra padding/box weight fragile
  // candles need — adjust PACKAGING_BUFFER_GRAMS to match your real packing.
  const PACKAGING_BUFFER_GRAMS = 150;
  const totalItemWeightGrams = order.items.reduce(
    (sum, item) => sum + (item.weight || 300) * item.quantity,
    0
  );
  const totalWeightKg = (totalItemWeightGrams + PACKAGING_BUFFER_GRAMS) / 1000;

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
    shipping_is_billing: true,
    payment_method: isCOD ? 'COD' : 'Prepaid',
    sub_total: Math.round(order.pricing.subtotal),
    length: 20,
    breadth: 15,
    height: 15,
    weight: totalWeightKg,
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

// ============================================
// NEW: Assign a courier + generate AWB for a shipment
// Requires shipment_id (Shiprocket's, NOT your srOrderId) and courier_id
// courier_id comes from checkServiceability()'s available_courier_companies list
// ============================================
const assignAWB = async (shipmentId, courierId) => {
  const token = await getShiprocketToken();

  try {
    const res = await axios.post(
      `${BASE_URL}/courier/assign/awb`,
      { shipment_id: shipmentId, courier_id: courierId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('✅ AWB assigned:', res.data);
    return res.data;
  } catch (error) {
    console.error('❌ AWB assignment failed:', JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
};

// ============================================
// NEW: Schedule pickup for a shipment (needed before courier collects it)
// ============================================
const requestPickup = async (shipmentId) => {
  const token = await getShiprocketToken();

  try {
    const res = await axios.post(
      `${BASE_URL}/courier/generate/pickup`,
      { shipment_id: [shipmentId] },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('✅ Pickup requested:', res.data);
    return res.data;
  } catch (error) {
    console.error('❌ Pickup request failed:', JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
};

// ============================================
// NEW: Generate shipping label — returns a label_url (PDF)
// ============================================
const generateLabel = async (shipmentId) => {
  const token = await getShiprocketToken();

  try {
    const res = await axios.post(
      `${BASE_URL}/courier/generate/label`,
      { shipment_id: [shipmentId] },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('✅ Label generated:', res.data);
    return res.data; // res.data.label_url
  } catch (error) {
    console.error('❌ Label generation failed:', JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
};

// ============================================
// NEW: Generate invoice (nice-to-have, admins often need this alongside label)
// ============================================
const generateInvoice = async (shiprocketOrderId) => {
  const token = await getShiprocketToken();

  try {
    const res = await axios.post(
      `${BASE_URL}/orders/print/invoice`,
      { ids: [shiprocketOrderId] },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return res.data; // res.data.invoice_url
  } catch (error) {
    console.error('❌ Invoice generation failed:', JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
};

// ============================================
// NEW: Pull full order+shipment details directly from Shiprocket.
// Used for a "force refresh" button in the admin panel — doesn't rely
// on webhooks having fired. Returns AWB, courier, current status,
// pickup schedule date, etc. for a given Shiprocket order_id.
// ============================================
const getOrderDetails = async (shiprocketOrderId) => {
  const token = await getShiprocketToken();

  const res = await axios.get(`${BASE_URL}/orders/show/${shiprocketOrderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data; // res.data.data.shipments[0] has awb, courier_name, status, pickup_scheduled_date
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
  assignAWB,
  requestPickup,
  generateLabel,
  generateInvoice,
  getOrderDetails,
  trackShipment,
  cancelShipment,
  verifyWebhookSignature,
};