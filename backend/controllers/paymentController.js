const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const pricingService = require('../services/pricingService');
const razorpayService = require('../services/razorpayService');

// @desc Create a Razorpay Order for checkout
// @route POST /api/payments/create-order
exports.createPaymentOrder = async (req, res, next) => {
  try {
    const { deliveryMethod = 'standard', couponCode, items: directItems } = req.body;

    let itemsToProcess = directItems;
    if (!itemsToProcess || itemsToProcess.length === 0) {
      const cart = await Cart.findOne({ user: req.user._id });
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: 'Your cart is empty' });
      }
      itemsToProcess = cart.items;
    }

    const quote = await pricingService.calculateCartTotals(
      itemsToProcess,
      couponCode,
      deliveryMethod,
      req.user._id
    );

    if (quote.items.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid items found to checkout' });
    }

    // Verify stock
    for (const itm of quote.items) {
      if (itm.stockQuantity < itm.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${itm.title}. Only ${itm.stockQuantity} available.`
        });
      }
    }

    const receipt = `RCPT_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const rzpOrder = await razorpayService.createRazorpayOrder(quote.finalTotal, receipt, {
      userId: req.user._id.toString(),
      itemCount: quote.itemCount
    });

    res.status(200).json({
      success: true,
      keyId: razorpayService.getKeyId(),
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount, // in paise
      currency: rzpOrder.currency,
      quote,
      isSimulated: rzpOrder.isSimulated
    });
  } catch (err) {
    next(err);
  }
};

// @desc Verify Razorpay Payment Signature and finalize order
// @route POST /api/payments/verify
exports.verifyPaymentAndPlaceOrder = async (req, res, next) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      shippingAddress,
      deliveryMethod = 'standard',
      couponCode,
      items: directItems,
      paymentMethod = 'UPI / Card'
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Missing required payment credentials'
      });
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.street || !shippingAddress.city || !shippingAddress.postalCode) {
      return res.status(400).json({
        success: false,
        message: 'Valid shipping address is required to confirm order'
      });
    }

    // 1. Check duplicate order prevention
    const existingOrder = await Order.findOne({ razorpayOrderId });
    if (existingOrder) {
      return res.status(200).json({
        success: true,
        message: 'Order already processed',
        order: existingOrder
      });
    }

    // 2. Authoritative signature verification
    const isValidSignature = razorpayService.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValidSignature) {
      // Record failed transaction attempt
      await Payment.create({
        order: null,
        user: req.user._id,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        amount: 0,
        status: 'failed',
        failureReason: 'Invalid cryptographic signature',
        signatureVerified: false
      });

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid transaction signature. Order has NOT been created.'
      });
    }

    // 3. Re-calculate authoritative totals on server
    let itemsToProcess = directItems;
    if (!itemsToProcess || itemsToProcess.length === 0) {
      const cart = await Cart.findOne({ user: req.user._id });
      if (cart) itemsToProcess = cart.items;
    }

    const quote = await pricingService.calculateCartTotals(
      itemsToProcess,
      couponCode,
      deliveryMethod,
      req.user._id
    );

    if (quote.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items cannot be empty' });
    }

    // 4. Atomic Inventory Reservation
    // Decrement stock using atomic conditional update
    for (const item of quote.items) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.product, stockQuantity: { $gte: item.quantity } },
        { $inc: { stockQuantity: -item.quantity } },
        { new: true }
      );

      if (!updatedProduct) {
        return res.status(400).json({
          success: false,
          message: `Stock reservation failed: Product "${item.title}" is out of stock`
        });
      }
    }

    // 5. Update Coupon usage if coupon was applied
    if (quote.couponApplied) {
      const coupon = await Coupon.findOne({ code: quote.couponApplied.code });
      if (coupon) {
        coupon.usedCount += 1;
        const userUsageIdx = coupon.userUsage.findIndex(u => u.userId?.toString() === req.user._id.toString());
        if (userUsageIdx > -1) {
          coupon.userUsage[userUsageIdx].count += 1;
        } else {
          coupon.userUsage.push({ userId: req.user._id, count: 1 });
        }
        await coupon.save();
      }
    }

    // 6. Generate Friendly Order & Invoice Numbers
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${dateStr}-${randSuffix}`;
    const invoiceNumber = `INV-${dateStr}-${randSuffix}`;

    const estDays = deliveryMethod === 'express' ? 2 : 5;
    const estimatedDeliveryDate = new Date(Date.now() + estDays * 24 * 60 * 60 * 1000);

    // 7. Create Confirmed Order
    const order = await Order.create({
      orderNumber,
      user: req.user._id,
      items: quote.items.map(item => ({
        product: item.product,
        title: item.title,
        image: item.image,
        originalPrice: item.originalPrice,
        sellingPrice: item.sellingPrice,
        quantity: item.quantity,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        subtotal: item.lineSellingSubtotal,
        size: item.size,
        color: item.color
      })),
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        street: shippingAddress.street,
        apartment: shippingAddress.apartment || '',
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country || 'India',
        deliveryInstructions: shippingAddress.deliveryInstructions || ''
      },
      deliveryMethod,
      originalSubtotal: quote.originalSubtotal,
      sellingSubtotal: quote.sellingSubtotal,
      productDiscountTotal: quote.productDiscount,
      couponCode: quote.couponApplied?.code || '',
      couponDiscountTotal: quote.couponDiscount,
      taxableAmount: quote.taxableAmount,
      taxAmount: quote.taxBreakdown.totalTax,
      shippingFee: quote.shippingFee,
      totalAmount: quote.finalTotal,

      paymentStatus: 'paid',
      paymentMethod,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,

      orderStatus: 'Confirmed',
      timeline: [
        {
          status: 'Confirmed',
          timestamp: new Date(),
          note: `Payment verified successfully via ${paymentMethod}. Order confirmed.`
        }
      ],
      estimatedDeliveryDate,
      trackingNumber: `TRK${Date.now().toString().slice(-8)}`,
      invoiceNumber
    });

    // 8. Record Payment document
    await Payment.create({
      order: order._id,
      user: req.user._id,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      amount: quote.finalTotal,
      currency: 'INR',
      status: 'captured',
      method: paymentMethod,
      signatureVerified: true,
      rawResponse: { razorpayOrderId, razorpayPaymentId, status: 'captured' }
    });

    // 9. Clear user's Cart in database
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: [], appliedCoupon: undefined } }
    );

    res.status(201).json({
      success: true,
      message: 'Payment verified and order placed successfully!',
      order
    });
  } catch (err) {
    next(err);
  }
};

// @desc Razorpay Webhook listener (for automated gateway callbacks)
// @route POST /api/payments/webhook
exports.handleWebhook = async (req, res) => {
  try {
    const crypto = require('crypto');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (signature && webhookSecret) {
      const shasum = crypto.createHmac('sha256', webhookSecret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest('hex');

      if (digest !== signature) {
        return res.status(400).json({ status: 'invalid_signature' });
      }
    }

    const event = req.body.event;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ status: 'error' });
  }
};
