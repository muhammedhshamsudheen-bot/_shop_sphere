const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  applyCouponToCart,
  removeCouponFromCart,
  syncCart
} = require('../controllers/cartController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, getCart);
router.post('/items', protect, addToCart);
router.patch('/items/:itemId', protect, updateCartItem);
router.delete('/items/:itemId', protect, removeCartItem);
router.delete('/', protect, clearCart);
router.post('/coupon', protect, applyCouponToCart);
router.delete('/coupon', protect, removeCouponFromCart);
router.post('/sync', protect, syncCart);

module.exports = router;
