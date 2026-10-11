const Coupon = require('../models/Coupon');

// @desc Validate a coupon code against current subtotal
// @route POST /api/coupons/validate
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, subtotal = 0 } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Please provide coupon code' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid or inactive coupon code' });
    }

    const now = new Date();
    if (now < new Date(coupon.validFrom) || now > new Date(coupon.validUntil)) {
      return res.status(400).json({ success: false, message: 'This coupon has expired' });
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit has been reached' });
    }

    if (subtotal < coupon.minOrderValue) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value of ₹${coupon.minOrderValue} required for this coupon`
      });
    }

    if (req.user && coupon.perUserLimit) {
      const userUsage = coupon.userUsage.find(u => u.userId && u.userId.toString() === req.user._id.toString());
      if (userUsage && userUsage.count >= coupon.perUserLimit) {
        return res.status(400).json({
          success: false,
          message: `You have already redeemed this coupon the maximum permitted times (${coupon.perUserLimit})`
        });
      }
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount > 0) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else if (coupon.discountType === 'fixed') {
      discountAmount = Math.min(coupon.discountValue, subtotal);
    }

    res.status(200).json({
      success: true,
      message: 'Coupon is valid',
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: Math.round(discountAmount * 100) / 100,
        minOrderValue: coupon.minOrderValue,
        description: coupon.description
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get active available coupons for customers to view
// @route GET /api/coupons
exports.getPublicCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find({
      isActive: true,
      validUntil: { $gte: new Date() }
    }).select('code description discountType discountValue minOrderValue maxDiscount validUntil');

    res.status(200).json({
      success: true,
      coupons
    });
  } catch (err) {
    next(err);
  }
};

// @desc Admin: Get all coupons
// @route GET /api/coupons/admin
exports.getAllCouponsAdmin = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, coupons });
  } catch (err) {
    next(err);
  }
};

// @desc Admin: Create coupon
// @route POST /api/coupons/admin
exports.createCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json({ success: true, message: 'Coupon created successfully', coupon });
  } catch (err) {
    next(err);
  }
};

// @desc Admin: Update coupon
// @route PUT /api/coupons/admin/:id
exports.updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    res.status(200).json({ success: true, message: 'Coupon updated successfully', coupon });
  } catch (err) {
    next(err);
  }
};

// @desc Admin: Delete coupon
// @route DELETE /api/coupons/admin/:id
exports.deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err) {
    next(err);
  }
};
