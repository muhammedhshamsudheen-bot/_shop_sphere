const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus,
  getAllCustomers,
  toggleCustomerStatus,
  getReports
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/orders', getAllOrders);
router.patch('/orders/:id/status', updateOrderStatus);
router.get('/customers', getAllCustomers);
router.patch('/customers/:id/toggle-status', toggleCustomerStatus);
router.get('/reports', getReports);

module.exports = router;
