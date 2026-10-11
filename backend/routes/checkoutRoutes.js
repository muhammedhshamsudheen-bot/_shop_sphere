const express = require('express');
const router = express.Router();
const { getCheckoutQuote } = require('../controllers/checkoutController');
const { protect } = require('../middleware/auth');

router.post('/quote', protect, getCheckoutQuote);

module.exports = router;
