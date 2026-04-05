const express = require('express');
const router = express.Router();

const { adminMiddleware } = require('../middleware/AdminMiddleware');

const adminAuthController    = require('../controllers/Admin/AdminAuthController');
const adminOrderController   = require('../controllers/Admin/AdminOrderController');
const adminProductController = require('../controllers/Admin/AdminProductController');

// ============================================================
// AUTH ROUTES  —  /api/admin/auth/...
// ============================================================

// Public
router.post('/auth/login',    adminAuthController.loginAdmin);

// Protected (any admin)
router.get( '/auth/me',               adminMiddleware, adminAuthController.getMe);
router.patch('/auth/change-password', adminMiddleware, adminAuthController.changePassword);

router.post('/auth/register',                        adminAuthController.registerAdmin);
router.get( '/auth/admins',                            adminMiddleware, adminAuthController.listAdmins);
router.patch('/auth/admins/:adminId/deactivate',       adminMiddleware, adminAuthController.deactivateAdmin);


// ============================================================
// ORDER ROUTES  —  /api/admin/orders/...
// All routes below require a valid admin JWT
// ============================================================
router.use(adminMiddleware); // apply once — covers all routes below

// Stats / dashboard  (must come before /:orderId to avoid route collision)
router.get('/orders/stats', adminOrderController.getDashboardStats);

// Listing + detail
router.get('/orders',           adminOrderController.getAllOrders);
router.get('/orders/:orderId',  adminOrderController.getOrderDetail);

// Mutations
router.patch('/orders/:orderId/status',          adminOrderController.updateOrderStatus);
router.patch('/orders/:orderId/cancel',          adminOrderController.cancelOrder);
router.get(  '/orders/:orderId/track',           adminOrderController.trackOrder);
router.post( '/orders/:orderId/retry-shipment',  adminOrderController.retryShipment);

router.post('/orders/:orderId/ship', adminMiddleware, adminOrderController.shipOrder);
router.post('/orders/:orderId/label', adminMiddleware, adminOrderController.getShipmentLabel);

// ============================================================
// PRODUCT ROUTES  —  /api/admin/products/...
// ============================================================

// Stats (must come before /:id)
router.get('/products/stats', adminProductController.getProductStats);

// Bulk operations (must come before /:id)
router.post(  '/products/bulk',  adminProductController.bulkCreateProducts);
router.delete('/products/bulk',  adminProductController.bulkDeleteProducts);

// Standard CRUD
router.get(   '/products',     adminProductController.getAllProducts);
router.post(  '/products',     adminProductController.createProduct);
router.get(   '/products/:id', adminProductController.getProductById);
router.patch( '/products/:id', adminProductController.updateProduct);
router.delete('/products/:id', adminProductController.deleteProduct);

// Toggle flags (isNewArrival / isBestSeller)
router.patch('/products/:id/toggle', adminProductController.toggleProductFlag);


module.exports = router;