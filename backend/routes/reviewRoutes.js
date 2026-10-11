const express = require('express');
const router = express.Router();
const {
  getProductReviews,
  addReview,
  deleteReview
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.get('/product/:productId', getProductReviews);
router.post('/product/:productId', protect, addReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
