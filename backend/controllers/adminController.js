const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Coupon = require('../models/Coupon');

// @desc Get comprehensive admin dashboard statistics
// @route GET /api/admin/dashboard
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalProducts = await Product.countDocuments({ isActive: true });
    const lowStockCount = await Product.countDocuments({ isActive: true, stockQuantity: { $lte: 5 } });
    const pendingOrdersCount = await Order.countDocuments({
      orderStatus: { $in: ['Pending', 'Confirmed', 'Processing'] }
    });

    // Sales calculation
    const salesAggregation = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalTaxCollected: { $sum: '$taxAmount' },
          totalDiscountGiven: { $sum: { $add: ['$productDiscountTotal', '$couponDiscountTotal'] } }
        }
      }
    ]);

    const totalRevenue = salesAggregation[0]?.totalRevenue || 0;
    const totalTaxCollected = salesAggregation[0]?.totalTaxCollected || 0;

    // Recent 10 orders
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    // Low stock products list
    const lowStockProducts = await Product.find({ isActive: true, stockQuantity: { $lte: 5 } })
      .select('title brand stockQuantity sellingPrice images')
      .limit(10);

    // Sales by last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        totalCustomers,
        totalProducts,
        lowStockCount,
        pendingOrdersCount,
        totalTaxCollected: Math.round(totalTaxCollected * 100) / 100
      },
      recentOrders,
      lowStockProducts,
      dailySales
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get all orders for admin with filter & pagination
// @route GET /api/admin/orders
exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, paymentStatus, search, page = 1, limit = 15 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.orderStatus = status;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus;
    }

    if (search && search.trim()) {
      query.$or = [
        { orderNumber: { $regex: search.trim(), $options: 'i' } },
        { 'shippingAddress.fullName': { $regex: search.trim(), $options: 'i' } },
        { 'shippingAddress.phone': { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * pageSize;

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize) || 1,
      orders
    });
  } catch (err) {
    next(err);
  }
};

// @desc Update order status & tracking info
// @route PATCH /api/admin/orders/:id/status
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (status) {
      order.orderStatus = status;
      if (trackingNumber) {
        order.trackingNumber = trackingNumber;
      }

      order.timeline.push({
        status,
        timestamp: new Date(),
        note: note || `Order status updated to ${status} by admin.`
      });

      // If marked as Returned or Cancelled by admin, restore stock if not already restored
      if (status === 'Returned' || status === 'Cancelled') {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stockQuantity: item.quantity }
          });
        }
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get customer accounts list
// @route GET /api/admin/customers
exports.getAllCustomers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = { role: 'customer' };

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * pageSize;

    const total = await User.countDocuments(query);
    const customers = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    // Compute order stats per customer
    const customersWithStats = await Promise.all(
      customers.map(async c => {
        const orderCount = await Order.countDocuments({ user: c._id });
        const spendAgg = await Order.aggregate([
          { $match: { user: c._id, paymentStatus: 'paid' } },
          { $group: { _id: null, totalSpent: { $sum: '$totalAmount' } } }
        ]);
        return {
          ...c.toObject(),
          totalOrders: orderCount,
          totalSpent: spendAgg[0]?.totalSpent || 0
        };
      })
    );

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize) || 1,
      customers: customersWithStats
    });
  } catch (err) {
    next(err);
  }
};

// @desc Toggle customer account active state
// @route PATCH /api/admin/customers/:id/toggle-status
exports.toggleCustomerStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot deactivate admin accounts' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Account has been ${user.isActive ? 'activated' : 'deactivated'}`,
      user: { id: user._id, name: user.name, email: user.email, isActive: user.isActive }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get analytics & reports
// @route GET /api/admin/reports
exports.getReports = async (req, res, next) => {
  try {
    // Best selling products
    const bestSelling = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          title: { $first: '$items.title' },
          image: { $first: '$items.image' },
          totalUnitsSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { totalUnitsSold: -1 } },
      { $limit: 8 }
    ]);

    // Revenue by category
    const categoryRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDoc'
        }
      },
      { $unwind: '$productDoc' },
      {
        $group: {
          _id: '$productDoc.categoryName',
          revenue: { $sum: '$items.subtotal' },
          units: { $sum: '$items.quantity' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    res.status(200).json({
      success: true,
      bestSelling,
      categoryRevenue
    });
  } catch (err) {
    next(err);
  }
};
