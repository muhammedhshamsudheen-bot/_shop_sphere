const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const errorHandler = require('./middleware/error');
const { apiLimiter } = require('./middleware/rateLimiter');
const razorpayService = require('./services/razorpayService');

// Route imports
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const couponRoutes = require('./routes/couponRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const shippingRoutes = require('./routes/shippingRoutes');

const app = express();

// Security Headers configured for Razorpay and FontAwesome CDN
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://checkout.razorpay.com',
          'https://cdnjs.cloudflare.com',
          'https://cdn.jsdelivr.net'
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdnjs.cloudflare.com',
          'https://fonts.googleapis.com'
        ],
        fontSrc: [
          "'self'",
          'https://cdnjs.cloudflare.com',
          'https://fonts.gstatic.com'
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://images.unsplash.com',
          'https://via.placeholder.com',
          'https://cdn-icons-png.flaticon.com'
        ],
        frameSrc: ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
        connectSrc: ["'self'", 'https://api.razorpay.com', 'https://lumberjack.razorpay.com']
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// Enable CORS
app.use(
  cors({
    origin: true,
    credentials: true
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Serve Frontend Static Assets
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Public Store Configuration endpoint
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    storeName: process.env.STORE_NAME || 'ShopSphere',
    currency: process.env.STORE_CURRENCY || 'INR',
    currencySymbol: process.env.STORE_CURRENCY_SYMBOL || '₹',
    razorpayKeyId: razorpayService.getKeyId(),
    isSimulationMode: razorpayService.isSimulationMode(),
    freeShippingThreshold: Number(process.env.FREE_SHIPPING_THRESHOLD || 999),
    standardShippingFee: Number(process.env.STANDARD_SHIPPING_FEE || 70),
    expressShippingFee: Number(process.env.EXPRESS_SHIPPING_FEE || 150)
  });
});

// API Routes with general rate limiter
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/shipping', shippingRoutes);

// Fallback to index.html for root or missing frontend routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
