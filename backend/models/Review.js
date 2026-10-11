const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Please provide rating between 1 and 5'],
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100,
    default: ''
  },
  comment: {
    type: String,
    required: [true, 'Please write your review comment'],
    trim: true,
    maxlength: 1000
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Prevent duplicate review per user per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

// Static method to recalculate product's average rating
reviewSchema.statics.getAverageRating = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        numReviews: { $sum: 1 }
      }
    }
  ]);

  try {
    if (stats.length > 0) {
      await mongoose.model('Product').findByIdAndUpdate(productId, {
        averageRating: Math.round(stats[0].averageRating * 10) / 10,
        numReviews: stats[0].numReviews
      });
    } else {
      await mongoose.model('Product').findByIdAndUpdate(productId, {
        averageRating: 0,
        numReviews: 0
      });
    }
  } catch (err) {
    console.error('Error recalculating review stats:', err);
  }
};

reviewSchema.post('save', async function () {
  await this.constructor.getAverageRating(this.product);
});

reviewSchema.post('remove', async function () {
  await this.constructor.getAverageRating(this.product);
});

module.exports = mongoose.model('Review', reviewSchema);
