const express = require('express');
const router = express.Router();
const {
  getMyOrders,
  getOrderById,
  cancelOrder,
  requestReturn
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.get('/my-orders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.post('/:id/cancel', protect, cancelOrder);
router.post('/:id/return', protect, requestReturn);

module.exports = router;
