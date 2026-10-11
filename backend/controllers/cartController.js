const Cart = require('../models/Cart');
const Product = require('../models/Product');
const pricingService = require('../services/pricingService');

// Helper to get or create cart for user
async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
}

// @desc Get current cart with authoritative pricing breakdown
// @route GET /api/cart
exports.getCart = async (req, res, next) => {
  try {
    const deliveryMethod = req.query.deliveryMethod || 'standard';
    let cartItems = [];
    let couponCode = null;

    if (req.user) {
      const cart = await Cart.findOne({ user: req.user._id });
      if (cart) {
        cartItems = cart.items;
        couponCode = cart.appliedCoupon?.code || null;
      }
    }

    const calculation = await pricingService.calculateCartTotals(
      cartItems,
      couponCode,
      deliveryMethod,
      req.user?._id
    );

    res.status(200).json({
      success: true,
      cart: calculation
    });
  } catch (err) {
    next(err);
  }
};

// @desc Add item to cart
// @route POST /api/cart/items
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, size = '', color = '' } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found or inactive' });
    }

    if (product.stockQuantity <= 0) {
      return res.status(400).json({ success: false, message: 'Sorry, this product is currently out of stock' });
    }

    let cart = await getOrCreateCart(req.user._id);

    // Check if item already exists in cart with same size and color
    const existingIndex = cart.items.findIndex(item =>
      item.product.toString() === productId.toString() &&
      item.size === size &&
      item.color === color
    );

    const qtyToAdd = Math.max(1, parseInt(quantity, 10));

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + qtyToAdd;
      if (newQty > product.stockQuantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more. Only ${product.stockQuantity} items in stock.`
        });
      }
      cart.items[existingIndex].quantity = newQty;
    } else {
      if (qtyToAdd > product.stockQuantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot add ${qtyToAdd} items. Only ${product.stockQuantity} available.`
        });
      }
      cart.items.push({
        product: product._id,
        quantity: qtyToAdd,
        size,
        color,
        priceSnapshot: product.sellingPrice
      });
    }

    await cart.save();

    const calculation = await pricingService.calculateCartTotals(
      cart.items,
      cart.appliedCoupon?.code,
      'standard',
      req.user._id
    );

    res.status(200).json({
      success: true,
      message: `${product.title} added to cart`,
      cart: calculation
    });
  } catch (err) {
    next(err);
  }
};

// @desc Update cart item quantity
// @route PATCH /api/cart/items/:itemId
exports.updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
    }

    const cart = await getOrCreateCart(req.user._id);
    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    const product = await Product.findById(item.product);
    if (!product || !product.isActive) {
      cart.items.pull(itemId);
      await cart.save();
      return res.status(400).json({ success: false, message: 'Product is no longer available' });
    }

    if (qty > product.stockQuantity) {
      return res.status(400).json({
        success: false,
        message: `Maximum available stock is ${product.stockQuantity}`
      });
    }

    item.quantity = qty;
    await cart.save();

    const calculation = await pricingService.calculateCartTotals(
      cart.items,
      cart.appliedCoupon?.code,
      'standard',
      req.user._id
    );

    res.status(200).json({
      success: true,
      message: 'Cart updated',
      cart: calculation
    });
  } catch (err) {
    next(err);
  }
};

// @desc Remove single item from cart
// @route DELETE /api/cart/items/:itemId
exports.removeCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const cart = await getOrCreateCart(req.user._id);

    cart.items.pull({ _id: itemId });
    await cart.save();

    const calculation = await pricingService.calculateCartTotals(
      cart.items,
      cart.appliedCoupon?.code,
      'standard',
      req.user._id
    );

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      cart: calculation
    });
  } catch (err) {
    next(err);
  }
};

// @desc Clear entire cart
// @route DELETE /api/cart
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = [];
    cart.appliedCoupon = undefined;
    await cart.save();

    const calculation = await pricingService.calculateCartTotals([], null, 'standard', req.user._id);

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      cart: calculation
    });
  } catch (err) {
    next(err);
  }
};

// @desc Apply coupon to cart
// @route POST /api/cart/coupon
exports.applyCouponToCart = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Please provide coupon code' });
    }

    const cart = await getOrCreateCart(req.user._id);

    const calculation = await pricingService.calculateCartTotals(
      cart.items,
      code,
      'standard',
      req.user._id
    );

    if (calculation.couponError) {
      return res.status(400).json({
        success: false,
        message: calculation.couponError
      });
    }

    cart.appliedCoupon = {
      code: calculation.couponApplied.code,
      discountAmount: calculation.couponApplied.discountAmount,
      discountType: calculation.couponApplied.discountType
    };
    await cart.save();

    res.status(200).json({
      success: true,
      message: `Coupon '${code.toUpperCase()}' applied successfully!`,
      cart: calculation
    });
  } catch (err) {
    next(err);
  }
};

// @desc Remove applied coupon from cart
// @route DELETE /api/cart/coupon
exports.removeCouponFromCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    cart.appliedCoupon = undefined;
    await cart.save();

    const calculation = await pricingService.calculateCartTotals(
      cart.items,
      null,
      'standard',
      req.user._id
    );

    res.status(200).json({
      success: true,
      message: 'Coupon removed',
      cart: calculation
    });
  } catch (err) {
    next(err);
  }
};

// @desc Synchronize local/guest cart with logged-in user cart
// @route POST /api/cart/sync
exports.syncCart = async (req, res, next) => {
  try {
    const { localItems = [] } = req.body;
    const cart = await getOrCreateCart(req.user._id);

    for (const localItem of localItems) {
      const productId = localItem.productId || localItem.product;
      const product = await Product.findById(productId);
      if (!product || !product.isActive) continue;

      const existingIndex = cart.items.findIndex(item =>
        item.product.toString() === productId.toString() &&
        item.size === (localItem.size || '') &&
        item.color === (localItem.color || '')
      );

      const qty = Math.min(localItem.quantity || 1, product.stockQuantity);

      if (existingIndex > -1) {
        cart.items[existingIndex].quantity = Math.min(
          cart.items[existingIndex].quantity + qty,
          product.stockQuantity
        );
      } else {
        cart.items.push({
          product: product._id,
          quantity: qty,
          size: localItem.size || '',
          color: localItem.color || '',
          priceSnapshot: product.sellingPrice
        });
      }
    }

    await cart.save();

    const calculation = await pricingService.calculateCartTotals(
      cart.items,
      cart.appliedCoupon?.code,
      'standard',
      req.user._id
    );

    res.status(200).json({
      success: true,
      message: 'Cart synchronized',
      cart: calculation
    });
  } catch (err) {
    next(err);
  }
};
