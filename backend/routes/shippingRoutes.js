const express = require('express');
const router = express.Router();
const { estimateDelivery } = require('../controllers/shippingController');

router.get('/estimate', estimateDelivery);
router.get('/estimate/:pincode', estimateDelivery);

module.exports = router;
