const Checkout = require('../../models/CheckoutModel');
const {
  checkServiceability,
  assignAWB,
  requestPickup,
  generateLabel,
  generateInvoice,
  getOrderDetails,
  trackShipment,
  cancelShipment,
} = require('../../utils/shiprocket');
const { sendEmailSafe } = require('../../utils/email');

const toOrderNumber = (id) => id.toString().slice(-8).toUpperCase();

// ============================================
// REFRESH SHIPMENT STATUS (force sync from Shiprocket — doesn't wait on webhooks)
// GET /api/admin/orders/:orderId/refresh-shipment
// Use this to show admin a definitive "is this properly assigned?" answer,
// and to backfill AWB/courier/pickup info if a webhook was missed or delayed.
// ============================================
exports.refreshShipmentStatus = async (req, res) => {
  try {
    const order = await Checkout.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (!order.srOrderId) {
      return res.status(200).json({
        success: true,
        data: {
          synced: false,
          reason: 'Order has not been pushed to Shiprocket yet.',
        },
      });
    }

    const srData = await getOrderDetails(order.srOrderId);
    const shipment = srData?.data?.shipments?.[0];

    if (!shipment) {
      return res.status(200).json({
        success: true,
        data: { synced: false, reason: 'No shipment record found on Shiprocket yet — order may still be processing.' },
      });
    }

    // Backfill anything the webhook may have missed
    const updates = {};
    if (shipment.awb && !order.srAwb) {
      updates.srAwb = shipment.awb;
      updates.trackingNumber = shipment.awb;
      updates.awbAssignedAt = new Date();
    }
    if (shipment.courier_name && !order.srCourier) {
      updates.srCourier = shipment.courier_name;
    }
    if (Object.keys(updates).length) {
      await Checkout.findByIdAndUpdate(order._id, { $set: updates });
    }

    res.status(200).json({
      success: true,
      data: {
        synced: true,
        awb: shipment.awb || order.srAwb || null,
        courier: shipment.courier_name || order.srCourier || null,
        shiprocketStatus: shipment.status || null,
        pickupScheduledDate: shipment.pickup_scheduled_date || null,
        courierAssigned: !!(shipment.awb || order.srAwb),
      },
    });
  } catch (error) {
    console.error('refreshShipmentStatus error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to refresh shipment status.', error: error.message });
  }
};

// ============================================
// GET AVAILABLE COURIERS for an order's pincode
// GET /api/admin/orders/:orderId/couriers
// Returns list for admin to pick from (rate, name, courier_company_id, ETD)
// ============================================
exports.getAvailableCouriers = async (req, res) => {
  try {
    const order = await Checkout.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (!order.shippingAddress?.pincode) {
      return res.status(400).json({ success: false, message: 'Order has no shipping pincode.' });
    }

    const isCOD = order.paymentMethod === 'cod';
    const srData = await checkServiceability(order.shippingAddress.pincode, isCOD);

    const couriers = srData?.data?.available_courier_companies || [];

    // Sort cheapest-first so the UI can default to the top option
    const sorted = [...couriers].sort((a, b) => (a.rate || 0) - (b.rate || 0));

    res.status(200).json({ success: true, data: sorted });
  } catch (error) {
    console.error('getAvailableCouriers error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch courier options.', error: error.message });
  }
};

// ============================================
// ASSIGN COURIER + AWB
// POST /api/admin/orders/:orderId/assign-courier
// Body: { courierId }
// ============================================
exports.assignCourier = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { courierId } = req.body;

    if (!courierId) {
      return res.status(400).json({ success: false, message: 'courierId is required.' });
    }

    const order = await Checkout.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (!order.srShipmentId) {
      return res.status(400).json({
        success: false,
        message: 'No Shiprocket shipment ID found on this order — shipment may not have been created yet.',
      });
    }

    if (order.srAwb) {
      return res.status(400).json({ success: false, message: `AWB already assigned: ${order.srAwb}` });
    }

    const data = await assignAWB(order.srShipmentId, courierId);

    if (data?.response?.data?.awb_code || data?.awb_code) {
      const awb = data.response?.data?.awb_code || data.awb_code;
      const courierName = data.response?.data?.courier_name || data.courier_name;

      order.srAwb = awb;
      order.srCourier = courierName;
      order.trackingNumber = awb;
      order.awbAssignedAt = new Date();
      order.orderStatus = 'confirmed';
      await order.save();

      return res.status(200).json({
        success: true,
        message: 'Courier assigned and AWB generated.',
        data: { awb, courier: courierName },
      });
    }

    res.status(200).json({ success: false, message: data?.message || 'AWB assignment did not return an AWB.' });
  } catch (error) {
    console.error('assignCourier error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to assign courier.', error: error.message });
  }
};

// ============================================
// SCHEDULE PICKUP
// POST /api/admin/orders/:orderId/schedule-pickup
// ============================================
exports.schedulePickup = async (req, res) => {
  try {
    const order = await Checkout.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (!order.srShipmentId) {
      return res.status(400).json({ success: false, message: 'No shipment ID on this order.' });
    }
    if (!order.srAwb) {
      return res.status(400).json({ success: false, message: 'Assign a courier/AWB before scheduling pickup.' });
    }

    const data = await requestPickup(order.srShipmentId);

    res.status(200).json({
      success: data?.pickup_status !== undefined ? true : false,
      message: data?.pickup_status !== undefined ? 'Pickup scheduled.' : (data?.message || 'Pickup scheduling failed.'),
      data,
    });
  } catch (error) {
    console.error('schedulePickup error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to schedule pickup.', error: error.message });
  }
};

// ============================================
// GET SHIPPING LABEL
// GET /api/admin/orders/:orderId/label
// ============================================
exports.getShipmentLabel = async (req, res) => {
  try {
    const order = await Checkout.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (!order.srShipmentId) {
      return res.status(400).json({ success: false, message: 'No shipment ID on this order.' });
    }
    if (!order.srAwb) {
      return res.status(400).json({ success: false, message: 'Assign a courier before generating a label.' });
    }

    const data = await generateLabel(order.srShipmentId);

    if (data?.label_created && data?.label_url) {
      return res.status(200).json({ success: true, data: { label_url: data.label_url } });
    }

    res.status(200).json({ success: false, message: data?.message || 'Label not available yet.' });
  } catch (error) {
    console.error('getShipmentLabel error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch label.', error: error.message });
  }
};

// ============================================
// GET INVOICE
// GET /api/admin/orders/:orderId/invoice
// ============================================
exports.getInvoice = async (req, res) => {
  try {
    const order = await Checkout.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (!order.srOrderId) {
      return res.status(400).json({ success: false, message: 'No Shiprocket order ID on this order.' });
    }

    const data = await generateInvoice(order.srOrderId);

    if (data?.invoice_url) {
      return res.status(200).json({ success: true, data: { invoice_url: data.invoice_url } });
    }

    res.status(200).json({ success: false, message: data?.message || 'Invoice not available.' });
  } catch (error) {
    console.error('getInvoice error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch invoice.', error: error.message });
  }
};

// ============================================
// TRACK SHIPMENT
// GET /api/admin/orders/:orderId/track
// ============================================
exports.trackOrder = async (req, res) => {
  try {
    const order = await Checkout.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (!order.srOrderId) {
      return res.status(404).json({ success: false, message: 'No tracking information available yet.' });
    }

    const trackingData = await trackShipment(order.srOrderId);

    res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: toOrderNumber(order._id),
        awb: order.srAwb,
        courier: order.srCourier,
        tracking: trackingData,
      },
    });
  } catch (error) {
    console.error('trackOrder error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch tracking info.', error: error.message });
  }
};

// ============================================
// UPDATE ORDER STATUS (manual override — status-label only, no Shiprocket call)
// PATCH /api/admin/orders/:orderId/status
// ============================================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus, notifyCustomer } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'ndr', 'rto', 'rto_complete'];
    if (orderStatus && !validStatuses.includes(orderStatus)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await Checkout.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (orderStatus) order.orderStatus = orderStatus;
    if (orderStatus === 'delivered') {
      order.deliveredAt = new Date();
      order.paymentStatus = 'completed';
    }
    await order.save();

    if (notifyCustomer && order.contactInfo?.email) {
      const orderNumber = toOrderNumber(order._id);
      const subject = `Order #${orderNumber} status updated to ${orderStatus}`;
      try {
        await sendEmailSafe(order.contactInfo.email, subject, subject);
      } catch (emailErr) {
        console.error('Status notification email failed:', emailErr);
      }
    }

    res.status(200).json({ success: true, message: 'Order status updated.', data: order });
  } catch (error) {
    console.error('updateOrderStatus error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update order status.', error: error.message });
  }
};

// ============================================
// CANCEL ORDER (admin-initiated)
// PATCH /api/admin/orders/:orderId/cancel
// ============================================
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, notifyCustomer } = req.body;

    const order = await Checkout.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (order.orderStatus === 'delivered') {
      return res.status(400).json({ success: false, message: 'Cannot cancel an already delivered order.' });
    }
    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Order is already cancelled.' });
    }

    order.orderStatus = 'cancelled';
    order.notes = reason || 'Cancelled by admin';
    await order.save();

    if (order.srOrderId) {
      try {
        await cancelShipment(order.srOrderId);
      } catch (srErr) {
        console.error('Shiprocket cancel failed:', srErr.message);
      }
    }

    if (notifyCustomer && order.contactInfo?.email) {
      const orderNumber = toOrderNumber(order._id);
      try {
        await sendEmailSafe(
          order.contactInfo.email,
          `Your order #${orderNumber} has been cancelled`,
          `Hi ${order.contactInfo.firstName}, your order #${orderNumber} has been cancelled. Reason: ${reason || 'Not specified'}.`
        );
      } catch (emailErr) {
        console.error('Cancellation email failed:', emailErr);
      }
    }

    res.status(200).json({ success: true, message: 'Order cancelled successfully.', data: order });
  } catch (error) {
    console.error('cancelOrder error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to cancel order.', error: error.message });
  }
};

// ============================================
// DASHBOARD STATS
// GET /api/admin/orders/stats
// ============================================
exports.getDashboardStats = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const since = new Date();
    since.setDate(since.getDate() - Number(period));

    const [overall, recent, revenueByDay] = await Promise.all([
      // All-time summary
      Checkout.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue:    { $sum: '$pricing.total' },
            totalOrders:     { $sum: 1 },
            avgOrderValue:   { $avg: '$pricing.total' },
            pendingCount:    { $sum: { $cond: [{ $eq: ['$orderStatus', 'pending'] },    1, 0] } },
            confirmedCount:  { $sum: { $cond: [{ $eq: ['$orderStatus', 'confirmed'] },  1, 0] } },
            processingCount: { $sum: { $cond: [{ $eq: ['$orderStatus', 'processing'] }, 1, 0] } },
            shippedCount:    { $sum: { $cond: [{ $eq: ['$orderStatus', 'shipped'] },    1, 0] } },
            deliveredCount:  { $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] },  1, 0] } },
            cancelledCount:  { $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] },  1, 0] } },
            ndrCount:        { $sum: { $cond: [{ $eq: ['$orderStatus', 'ndr'] },        1, 0] } },
            rtoCount:        { $sum: { $cond: [{ $in: ['$orderStatus', ['rto', 'rto_complete']] }, 1, 0] } },
            codRevenue:      { $sum: { $cond: [{ $eq: ['$paymentMethod', 'cod'] },  '$pricing.total', 0] } },
            onlineRevenue:   { $sum: { $cond: [{ $eq: ['$paymentMethod', 'online'] }, '$pricing.total', 0] } },
          },
        },
      ]),

      // Recent period summary
      Checkout.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: null,
            recentRevenue: { $sum: '$pricing.total' },
            recentOrders:  { $sum: 1 },
          },
        },
      ]),

      // Daily revenue for the period (for a chart)
      Checkout.aggregate([
        { $match: { createdAt: { $gte: since }, orderStatus: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: {
              year:  { $year:  '$createdAt' },
              month: { $month: '$createdAt' },
              day:   { $dayOfMonth: '$createdAt' },
            },
            revenue: { $sum: '$pricing.total' },
            orders:  { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        overall:      overall[0] || {},
        recent:       { ...recent[0], period: `${period} days` } || {},
        revenueByDay,
      },
    });
  } catch (error) {
    console.error('getDashboardStats error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats.', error: error.message });
  }
};

// ============================================
// GET ALL ORDERS (unchanged logic, kept as-is from your existing controller)
// GET /api/admin/orders
// ============================================
exports.getAllOrders = async (req, res) => {
  try {
    const {
      page = 1, limit = 20, status, paymentMethod, paymentStatus,
      search, startDate, endDate, sortBy = 'createdAt', order = 'desc',
    } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.orderStatus = status;
    if (paymentMethod && paymentMethod !== 'all') filter.paymentMethod = paymentMethod;
    if (paymentStatus && paymentStatus !== 'all') filter.paymentStatus = paymentStatus;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { 'contactInfo.firstName': new RegExp(search, 'i') },
        { 'contactInfo.lastName': new RegExp(search, 'i') },
        { 'contactInfo.email': new RegExp(search, 'i') },
        { 'contactInfo.phone': new RegExp(search, 'i') },
        { srAwb: new RegExp(search, 'i') },
        { trackingNumber: new RegExp(search, 'i') },
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const allowedSortFields = ['createdAt', 'pricing.total', 'orderStatus'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Checkout.find(filter)
        .populate('items.productId', 'name price img fragnance category')
        .populate('userId', 'name email phone')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Checkout.countDocuments(filter),
    ]);

    const ordersWithNumber = orders.map((o) => ({ ...o, orderNumber: toOrderNumber(o._id) }));

    const [summary] = await Checkout.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.total' },
          totalOrders: { $sum: 1 },
          pendingOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'pending'] }, 1, 0] } },
          confirmedOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'confirmed'] }, 1, 0] } },
          shippedOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'shipped'] }, 1, 0] } },
          deliveredOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] } },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      summary: summary || {},
      data: ordersWithNumber,
    });
  } catch (error) {
    console.error('getAllOrders error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch orders.', error: error.message });
  }
};

// ============================================
// GET SINGLE ORDER
// GET /api/admin/orders/:orderId
// ============================================
exports.getOrderDetail = async (req, res) => {
  try {
    const order = await Checkout.findById(req.params.orderId)
      .populate('items.productId', 'name price img fragnance category dimension')
      .populate('userId', 'name email phone')
      .lean();

    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    res.status(200).json({ success: true, data: { ...order, orderNumber: toOrderNumber(order._id) } });
  } catch (error) {
    console.error('getOrderDetail error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch order.', error: error.message });
  }
};