const Cart = require('../models/Cart');
const Product = require('../models/Product');
const pricingService = require('../services/pricingService');

// @desc Get official checkout quote and revalidate stock & pricing
// @route POST /api/checkout/quote
exports.getCheckoutQuote = async (req, res, next) => {
  try {
    const { deliveryMethod = 'standard', couponCode, items: directItems } = req.body;

    let itemsToProcess = directItems;

    // If no direct items provided, load from user's cart in DB
    if (!itemsToProcess || itemsToProcess.length === 0) {
      const cart = await Cart.findOne({ user: req.user._id });
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: 'Your cart is empty' });
      }
      itemsToProcess = cart.items;
    }

    // Check inventory stock availability
    const stockErrors = [];
    for (const item of itemsToProcess) {
      const pid = item.product?._id || item.product;
      const product = await Product.findById(pid);
      if (!product || !product.isActive) {
        stockErrors.push(`Product "${item.title || pid}" is no longer available`);
      } else if (product.stockQuantity < item.quantity) {
        stockErrors.push(`Only ${product.stockQuantity} units of "${product.title}" are in stock (requested ${item.quantity})`);
      }
    }

    if (stockErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some items in your cart have stock limitations',
        errors: stockErrors
      });
    }

    const effectiveCoupon = couponCode !== undefined ? couponCode : (req.user ? (await Cart.findOne({ user: req.user._id }))?.appliedCoupon?.code : null);

    const calculation = await pricingService.calculateCartTotals(
      itemsToProcess,
      effectiveCoupon,
      deliveryMethod,
      req.user._id
    );

    res.status(200).json({
      success: true,
      quote: calculation
    });
  } catch (err) {
    next(err);
  }
};
