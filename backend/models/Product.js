const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide product title'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  slug: {
    type: String,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide product description'],
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Please select a category']
  },
  categoryName: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    required: [true, 'Please provide brand name'],
    trim: true
  },
  images: [{
    type: String,
    required: true
  }],
  originalPrice: {
    type: Number,
    required: [true, 'Please provide original price'],
    min: [0, 'Price must be positive']
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Please provide selling price'],
    min: [0, 'Price must be positive']
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  taxRate: {
    type: Number,
    default: 18, // Default GST 18%, e.g. 5, 12, 18, 28
    enum: [0, 5, 12, 18, 28]
  },
  stockQuantity: {
    type: Number,
    required: [true, 'Please provide stock quantity'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  numReviews: {
    type: Number,
    default: 0,
    min: 0
  },
  specifications: {
    type: Map,
    of: String,
    default: {}
  },
  availableSizes: [{
    type: String,
    trim: true
  }],
  availableColors: [{
    type: String,
    trim: true
  }],
  isFeatured: {
    type: Boolean,
    default: false
  },
  isTrending: {
    type: Boolean,
    default: false
  },
  isBestSeller: {
    type: Boolean,
    default: false
  },
  isNewArrival: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Calculate discount percentage before saving
productSchema.pre('save', function (next) {
  if (this.originalPrice > 0 && this.sellingPrice < this.originalPrice) {
    this.discountPercentage = Math.round(((this.originalPrice - this.sellingPrice) / this.originalPrice) * 100);
  } else {
    this.discountPercentage = 0;
  }

  if (this.isModified('title') || !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + (Math.floor(1000 + Math.random() * 9000));
  }
  next();
});

// Indexes for fast searching and filtering
productSchema.index({ title: 'text', description: 'text', brand: 'text' });
productSchema.index({ category: 1, sellingPrice: 1, averageRating: -1 });

module.exports = mongoose.model('Product', productSchema);
