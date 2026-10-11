const Review = require('../models/Review');
const Order = require('../models/Order');

// @desc Get reviews for a product
// @route GET /api/reviews/product/:productId
exports.getProductReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (err) {
    next(err);
  }
};

// @desc Add or update review for product
// @route POST /api/reviews/product/:productId
exports.addReview = async (req, res, next) => {
  try {
    const { rating, comment, title } = req.body;
    const productId = req.params.productId;

    if (!rating || !comment) {
      return res.status(400).json({ success: false, message: 'Please provide rating (1-5) and review comment' });
    }

    // Check if user previously bought this product
    const orderWithItem = await Order.findOne({
      user: req.user._id,
      'items.product': productId,
      paymentStatus: 'paid'
    });

    const isVerifiedPurchase = Boolean(orderWithItem);

    // Check existing review
    let review = await Review.findOne({ user: req.user._id, product: productId });

    if (review) {
      review.rating = rating;
      review.comment = comment;
      review.title = title || review.title;
      review.isVerifiedPurchase = isVerifiedPurchase;
      await review.save();
    } else {
      review = await Review.create({
        user: req.user._id,
        product: productId,
        rating: Number(rating),
        title: title || '',
        comment,
        isVerifiedPurchase
      });
    }

    // Populate user info for immediate display
    await review.populate('user', 'name avatar');

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review
    });
  } catch (err) {
    next(err);
  }
};

// @desc Delete review
// @route DELETE /api/reviews/:id
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this review' });
    }

    const productId = review.product;
    await review.deleteOne();
    await Review.getAverageRating(productId);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};
