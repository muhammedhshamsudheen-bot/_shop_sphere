const express = require('express');
const router = express.Router();
const {
  createPaymentOrder,
  verifyPaymentAndPlaceOrder,
  handleWebhook
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.post('/create-order', protect, createPaymentOrder);
router.post('/verify', protect, verifyPaymentAndPlaceOrder);
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router;
