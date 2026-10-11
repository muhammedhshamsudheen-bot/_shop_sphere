const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  title: { type: String, required: true },
  image: { type: String, required: true },
  originalPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  taxRate: { type: Number, default: 18 },
  taxAmount: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
  size: { type: String, default: '' },
  color: { type: String, default: '' }
}, { _id: true });

const timelineEventSchema = new mongoose.Schema({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  note: { type: String, default: '' }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    apartment: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'India' },
    deliveryInstructions: { type: String, default: '' }
  },
  deliveryMethod: {
    type: String,
    enum: ['standard', 'express'],
    default: 'standard'
  },
  // Financial breakdown (Server calculated snapshots)
  originalSubtotal: { type: Number, required: true },
  sellingSubtotal: { type: Number, required: true },
  productDiscountTotal: { type: Number, default: 0 },
  couponCode: { type: String, default: '' },
  couponDiscountTotal: { type: Number, default: 0 },
  taxableAmount: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  shippingFee: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },

  // Payment Tracking
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    default: 'Razorpay'
  },
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  razorpaySignature: { type: String, default: '' },

  // Order Fulfillment Status
  orderStatus: {
    type: String,
    enum: [
      'Pending',
      'Confirmed',
      'Processing',
      'Packed',
      'Shipped',
      'Out for Delivery',
      'Delivered',
      'Cancelled',
      'Return Requested',
      'Returned',
      'Refunded'
    ],
    default: 'Pending'
  },
  timeline: [timelineEventSchema],
  estimatedDeliveryDate: { type: Date },
  trackingNumber: { type: String, default: '' },
  invoiceNumber: { type: String, default: '' },
  cancelReason: { type: String, default: '' },
  returnReason: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
