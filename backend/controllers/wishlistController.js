const Wishlist = require('../models/Wishlist');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

async function getOrCreateWishlist(userId) {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, products: [] });
  }
  return wishlist;
}

// @desc Get user's wishlist
// @route GET /api/wishlist
exports.getWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate('products', 'title sellingPrice originalPrice discountPercentage images stockQuantity brand averageRating numReviews');

    res.status(200).json({
      success: true,
      products: wishlist ? wishlist.products : []
    });
  } catch (err) {
    next(err);
  }
};

// @desc Toggle product in wishlist
// @route POST /api/wishlist/toggle
exports.toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const wishlist = await getOrCreateWishlist(req.user._id);
    const existingIndex = wishlist.products.findIndex(id => id.toString() === productId.toString());

    let action;
    if (existingIndex > -1) {
      wishlist.products.splice(existingIndex, 1);
      action = 'removed';
    } else {
      wishlist.products.push(productId);
      action = 'added';
    }

    await wishlist.save();

    res.status(200).json({
      success: true,
      message: action === 'added' ? 'Added to wishlist' : 'Removed from wishlist',
      action,
      productId,
      count: wishlist.products.length
    });
  } catch (err) {
    next(err);
  }
};

// @desc Move product from wishlist to cart
// @route POST /api/wishlist/move-to-cart/:productId
exports.moveToCart = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);

    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.stockQuantity <= 0) {
      return res.status(400).json({ success: false, message: 'Product is out of stock' });
    }

    // Remove from wishlist
    const wishlist = await getOrCreateWishlist(req.user._id);
    wishlist.products = wishlist.products.filter(id => id.toString() !== productId.toString());
    await wishlist.save();

    // Add to cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

    const existingIndex = cart.items.findIndex(item => item.product.toString() === productId.toString());
    if (existingIndex > -1) {
      cart.items[existingIndex].quantity = Math.min(cart.items[existingIndex].quantity + 1, product.stockQuantity);
    } else {
      cart.items.push({
        product: product._id,
        quantity: 1,
        priceSnapshot: product.sellingPrice
      });
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Moved item to shopping cart'
    });
  } catch (err) {
    next(err);
  }
};
