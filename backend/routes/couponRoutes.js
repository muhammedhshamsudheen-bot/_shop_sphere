const express = require('express');
const router = express.Router();
const {
  validateCoupon,
  getPublicCoupons,
  getAllCouponsAdmin,
  createCoupon,
  updateCoupon,
  deleteCoupon
} = require('../controllers/couponController');
const { protect, optionalAuth, authorize } = require('../middleware/auth');

router.post('/validate', optionalAuth, validateCoupon);
router.get('/', getPublicCoupons);

// Admin coupon management
router.get('/admin/all', protect, authorize('admin'), getAllCouponsAdmin);
router.post('/admin', protect, authorize('admin'), createCoupon);
router.put('/admin/:id', protect, authorize('admin'), updateCoupon);
router.delete('/admin/:id', protect, authorize('admin'), deleteCoupon);

module.exports = router;
