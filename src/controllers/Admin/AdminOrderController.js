const Checkout = require('../../models/CheckoutModel');
const { createShipment, trackShipment, cancelShipment, shipByOrderId, generateLabel } = require('../../utils/nimbuspost');
const { sendEmailSafe } = require('../../utils/email');

// ─── Helper ────────────────────────────────────────────────────────────────
const toOrderNumber = (id) => id.toString().slice(-8).toUpperCase();

// ============================================
// GET ALL ORDERS  (with full user + item details)
// GET /api/admin/orders
// Query params: page, limit, status, paymentMethod, paymentStatus,
//               search (name / email / phone / orderNumber),
//               startDate, endDate, sortBy, order
// ============================================
exports.getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentMethod,
      paymentStatus,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const filter = {};

    if (status && status !== 'all') filter.orderStatus = status;
    if (paymentMethod && paymentMethod !== 'all') filter.paymentMethod = paymentMethod;
    if (paymentStatus && paymentStatus !== 'all') filter.paymentStatus = paymentStatus;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // inclusive of end date
        filter.createdAt.$lte = end;
      }
    }

    // Search across name, email, phone
    if (search) {
      filter.$or = [
        { 'contactInfo.firstName': new RegExp(search, 'i') },
        { 'contactInfo.lastName':  new RegExp(search, 'i') },
        { 'contactInfo.email':     new RegExp(search, 'i') },
        { 'contactInfo.phone':     new RegExp(search, 'i') },
        { nimbusAwb:               new RegExp(search, 'i') },
        { trackingNumber:          new RegExp(search, 'i') },
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const allowedSortFields = ['createdAt', 'pricing.total', 'orderStatus'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Checkout.find(filter)
        .populate('items.productId', 'name price img fragnance category')
        .populate('userId', 'name email phone')  // if you have a User model
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Checkout.countDocuments(filter),
    ]);

    // Attach a clean orderNumber to each order in the response
    const ordersWithNumber = orders.map((o) => ({
      ...o,
      orderNumber: toOrderNumber(o._id),
    }));

    // Aggregate summary counts for the dashboard header
    const [summary] = await Checkout.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue:   { $sum: '$pricing.total' },
          totalOrders:    { $sum: 1 },
          pendingOrders:  { $sum: { $cond: [{ $eq: ['$orderStatus', 'pending'] },   1, 0] } },
          confirmedOrders:{ $sum: { $cond: [{ $eq: ['$orderStatus', 'confirmed'] }, 1, 0] } },
          shippedOrders:  { $sum: { $cond: [{ $eq: ['$orderStatus', 'shipped'] },   1, 0] } },
          deliveredOrders:{ $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] } },
          cancelledOrders:{ $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] } },
          codOrders:      { $sum: { $cond: [{ $eq: ['$paymentMethod', 'cod'] },     1, 0] } },
          onlineOrders:   { $sum: { $cond: [{ $eq: ['$paymentMethod', 'online'] },  1, 0] } },
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
    console.error('Admin getAllOrders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders.',
      error: error.message,
    });
  }
};

// ============================================
// GET SINGLE ORDER (full detail)
// GET /api/admin/orders/:orderId
// ============================================
exports.getOrderDetail = async (req, res) => {
  try {
    const order = await Checkout.findById(req.params.orderId)
      .populate('items.productId', 'name price img fragnance category dimension')
      .populate('userId', 'name email phone')
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.status(200).json({
      success: true,
      data: { ...order, orderNumber: toOrderNumber(order._id) },
    });
  } catch (error) {
    console.error('Admin getOrderDetail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order.',
      error: error.message,
    });
  }
};

// ============================================
// UPDATE ORDER STATUS
// PATCH /api/admin/orders/:orderId/status
// Body: { orderStatus, trackingNumber?, estimatedDelivery?, notifyCustomer? }
// ============================================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus, trackingNumber, estimatedDelivery, notifyCustomer } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (orderStatus && !validStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const order = await Checkout.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (orderStatus) order.orderStatus = orderStatus;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (estimatedDelivery) order.estimatedDelivery = new Date(estimatedDelivery);
    if (orderStatus === 'delivered') {
      order.deliveredAt = new Date();
      order.paymentStatus = 'completed'; // auto-complete COD on delivery
    }

    await order.save();

    // Optionally email the customer about the status change
    if (notifyCustomer && order.contactInfo?.email) {
      const orderNumber = toOrderNumber(order._id);
      const statusMessages = {
        confirmed:  `Your order #${orderNumber} has been confirmed!`,
        processing: `Your order #${orderNumber} is being processed.`,
        shipped:    `Your order #${orderNumber} has been shipped! AWB: ${order.nimbusAwb || trackingNumber || 'N/A'}`,
        delivered:  `Your order #${orderNumber} has been delivered. Thank you! 🎉`,
        cancelled:  `Your order #${orderNumber} has been cancelled.`,
      };
      const subject = statusMessages[orderStatus] || `Order #${orderNumber} status updated`;
      try {
        await sendEmailSafe(order.contactInfo.email, subject, subject);
      } catch (emailErr) {
        console.error('Status notification email failed:', emailErr);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully.',
      data: { ...order.toObject(), orderNumber: toOrderNumber(order._id) },
    });
  } catch (error) {
    console.error('Admin updateOrderStatus error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status.',
      error: error.message,
    });
  }
};

// ============================================
// CANCEL ORDER (admin-initiated)
// PATCH /api/admin/orders/:orderId/cancel
// Body: { reason?, notifyCustomer? }
// ============================================
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, notifyCustomer } = req.body;

    const order = await Checkout.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.orderStatus === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an already delivered order.',
      });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled.',
      });
    }

    order.orderStatus = 'cancelled';
    order.notes = reason || 'Cancelled by admin';
    await order.save();

    // Cancel shipment on NimbusPost if AWB exists
    if (order.nimbusAwb) {
      try {
        await cancelShipment(order.nimbusAwb);
      } catch (nimbusErr) {
        console.error('NimbusPost cancel failed:', nimbusErr.message);
        // Non-blocking — order is still marked cancelled in DB
      }
    }

    // Notify customer
    if (notifyCustomer && order.contactInfo?.email) {
      const orderNumber = toOrderNumber(order._id);
      try {
        await sendEmailSafe(
          order.contactInfo.email,
          `Your order #${orderNumber} has been cancelled`,
          `Hi ${order.contactInfo.firstName}, your order #${orderNumber} has been cancelled. Reason: ${reason || 'Not specified'}. Please contact support if you have questions.`
        );
      } catch (emailErr) {
        console.error('Cancellation email failed:', emailErr);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully.',
      data: order,
    });
  } catch (error) {
    console.error('Admin cancelOrder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order.',
      error: error.message,
    });
  }
};

// ============================================
// TRACK SHIPMENT
// GET /api/admin/orders/:orderId/track
// ============================================
exports.trackOrder = async (req, res) => {
  try {
    const order = await Checkout.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (!order.nimbusAwb) {
      return res.status(404).json({
        success: false,
        message: 'No tracking information available for this order yet.',
      });
    }

    const trackingData = await trackShipment(order.nimbusAwb);

    res.status(200).json({
      success: true,
      data: {
        orderId:     order._id,
        orderNumber: toOrderNumber(order._id),
        awb:         order.nimbusAwb,
        courier:     order.nimbusCourier,
        tracking:    trackingData,
      },
    });
  } catch (error) {
    console.error('Admin trackOrder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tracking info.',
      error: error.message,
    });
  }
};

// ============================================
// RETRY SHIPMENT CREATION (if NimbusPost failed at order time)
// POST /api/admin/orders/:orderId/retry-shipment
// ============================================
exports.retryShipment = async (req, res) => {
  try {
    const order = await Checkout.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.nimbusAwb) {
      return res.status(400).json({
        success: false,
        message: `Shipment already created. AWB: ${order.nimbusAwb}`,
      });
    }

    if (!['confirmed', 'processing'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Shipment can only be retried for confirmed or processing orders.',
      });
    }

    const orderNumber = toOrderNumber(order._id);
    const nimbusData = await createShipment({ ...order.toObject(), orderNumber });

    if (nimbusData?.data?.awb_number) {
      order.nimbusAwb     = nimbusData.data.awb_number;
      order.nimbusCourier = nimbusData.data.courier_name;
      order.nimbusOrderId = nimbusData.data.order_id?.toString();
      order.trackingNumber = nimbusData.data.awb_number;
      await order.save();
    }

    res.status(200).json({
      success: true,
      message: 'Shipment created successfully.',
      data: {
        awb:     order.nimbusAwb,
        courier: order.nimbusCourier,
      },
    });
  } catch (error) {
    console.error('Admin retryShipment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create shipment.',
      error: error.message,
    });
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
    console.error('Admin getDashboardStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats.',
      error: error.message,
    });
  }
};

exports.shipOrder = async (req, res) => {
  try {
    const order = await Checkout.findById(req.params.orderId);
    if (!order?.nimbusOrderId)
      return res.status(400).json({ success: false, message: 'No Nimbus order ID found. Create shipment first.' });

    const data = await shipByOrderId(order.nimbusOrderId);
    console.log('Ship by order ID response:', JSON.stringify(data));

    if (data.status) {
      order.nimbusAwb = data.data?.awb_number || order.nimbusAwb;
      order.nimbusCourier = data.data?.courier_name || order.nimbusCourier;
      order.trackingNumber = data.data?.awb_number || order.trackingNumber;
      order.orderStatus = 'processing';
      await order.save();
      res.json({ success: true, message: 'Shipment booked!', data: data.data });
    } else {
      res.json({ success: false, message: data.message || 'Failed to book shipment' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.getShipmentLabel = async (req, res) => {
  try {
    const order = await Checkout.findById(req.params.orderId);
    if (!order?.nimbusAwb)
      return res.status(400).json({ success: false, message: 'No AWB found.' });

    const data = await generateLabel(order.nimbusAwb);
    console.log('Label data:', JSON.stringify(data));

    // NimbusPost returns label as a URL or base64 — check the log to confirm
    if (data.status) {
      res.json({ 
        success: true, 
        data: {
          label_url: data.data?.label_url || data.data?.url || data.data,
          label_pdf: data.data?.pdf || null
        }
      });
    } else {
      res.json({ success: false, message: data.message || 'Label not available' });
    }
  } catch (err) {
    console.error('Label error:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};  