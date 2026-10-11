const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc Get current customer's order history
// @route GET /api/orders/my-orders
exports.getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * pageSize;

    const total = await Order.countDocuments({ user: req.user._id });
    const orders = await Order.find({ user: req.user._id })
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

// @desc Get single order by ID or orderNumber
// @route GET /api/orders/:id
exports.getOrderById = async (req, res, next) => {
  try {
    const id = req.params.id;
    let order;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(id).populate('user', 'name email phone');
    } else {
      order = await Order.findOne({ orderNumber: id }).populate('user', 'name email phone');
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify ownership or admin access
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (err) {
    next(err);
  }
};

// @desc Cancel an order (Customer or Admin)
// @route POST /api/orders/:id/cancel
exports.cancelOrder = async (req, res, next) => {
  try {
    const { reason = 'Cancelled by customer' } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this order' });
    }

    // Check cancellation eligibility
    const cancellableStatuses = ['Pending', 'Confirmed', 'Processing'];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled in '${order.orderStatus}' status. Only pending or processing orders can be cancelled.`
      });
    }

    // Restore stock inventory
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stockQuantity: item.quantity }
      });
    }

    order.orderStatus = 'Cancelled';
    order.cancelReason = reason;
    order.timeline.push({
      status: 'Cancelled',
      timestamp: new Date(),
      note: `Order cancelled. Reason: ${reason}. Product inventory restored.`
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });
  } catch (err) {
    next(err);
  }
};

// @desc Request return for a delivered order
// @route POST /api/orders/:id/return
exports.requestReturn = async (req, res, next) => {
  try {
    const { reason = 'Defective or unsatisfactory item' } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to request return' });
    }

    if (order.orderStatus !== 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Returns can only be requested for delivered orders.'
      });
    }

    order.orderStatus = 'Return Requested';
    order.returnReason = reason;
    order.timeline.push({
      status: 'Return Requested',
      timestamp: new Date(),
      note: `Return requested by customer. Reason: ${reason}`
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Return request submitted. Our support team will review within 24 hours.',
      order
    });
  } catch (err) {
    next(err);
  }
};
