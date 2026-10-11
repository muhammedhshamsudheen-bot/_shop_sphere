# ShopSphere — Modern Full-Stack E-Commerce & Shopping Cart Web Application

ShopSphere is a full-stack, responsive, and secure online shopping cart web application built with professional software architecture, modern UI/UX design, authoritative server-side pricing, Indian GST compliance, Razorpay test payment integration, and a comprehensive administrator operations portal.

---

## 🌟 Key Highlights & Architecture

- **Authoritative Server-Side Pricing Engine:** Subtotals, category-specific GST (5%, 12%, 18%, 28%), coupon allocations, and shipping fees are calculated strictly on the backend to prevent client-side price tampering.
- **Indian GST Compliance:** Precise per-item tax breakdown supporting CGST, SGST, IGST, and taxable value calculation according to product categories.
- **Dual Razorpay Payment Mode:** Real Razorpay test mode key support + integrated interactive test simulation mode for end-to-end checkout without requiring manual API credentials.
- **Cryptographic Signature Verification:** Strict HMAC SHA256 payment signature validation before inventory reservation and order fulfillment.
- **Zero-Friction Database:** Automatically connects to local MongoDB or MongoDB Atlas via `MONGODB_URI`, with an automatic fallback to an in-memory MongoDB instance for instant out-of-the-box local development.
- **Role-Based Access Control (RBAC):** Customer and Admin roles secured with JWT in HTTP-only cookies and Bearer token fallback.
- **Visual Order Tracking Timeline:** Real-time progression tracking (`Pending` → `Confirmed` → `Processing` → `Shipped` → `Out for Delivery` → `Delivered`) with tracking IDs and printable invoices.
- **Admin Operations Dashboard:** Live sales analytics, revenue breakdowns, product catalog CRUD, order fulfillment status updates, customer account controls, and coupon management.

---

## 📁 Project Directory Structure

```
Project_01/
├── frontend/
│   ├── index.html              # Homepage with hero, categories, curated collections
│   ├── shop.html               # Product catalog with search, filter sidebar, sorting
│   ├── product.html            # Product details with gallery, variants, reviews
│   ├── cart.html               # Shopping cart with coupon code, GST breakdown
│   ├── checkout.html           # Multi-step checkout with address & Razorpay payment
│   ├── login.html              # Authentication with 1-click Demo logins
│   ├── register.html           # Customer registration form
│   ├── profile.html            # Customer profile & saved addresses book
│   ├── orders.html             # Customer order history
│   ├── order-details.html      # Visual timeline tracker & printable invoice
│   ├── wishlist.html           # Saved wishlist with move-to-cart action
│   ├── admin.html              # Dedicated Admin Operations Portal
│   ├── css/
│   │   ├── style.css           # Core design system & modern component styles
│   │   ├── responsive.css      # Mobile drawer & responsive media queries
│   │   └── admin.css           # Admin dashboard tables & KPI cards
│   └── js/
│       ├── api.js              # Centralized API fetch client, toast & search
│       ├── auth.js             # Session state & profile dropdown
│       ├── products.js         # Product catalog browsing & filter logic
│       ├── product-details.js  # Gallery, variants & reviews submission
│       ├── cart.js             # Shopping cart recalculation & coupon apply
│       ├── checkout.js         # Stepper workflow & Razorpay payment handler
│       ├── orders.js           # Timeline tracker & invoice printer
│       ├── wishlist.js         # Wishlist management
│       └── admin.js            # Admin analytics, CRUD, and orders management
│
├── backend/
│   ├── server.js               # Server bootstrap & graceful shutdown
│   ├── app.js                  # Express application, security headers & routing
│   ├── config/
│   │   └── database.js         # Mongoose & MongoMemoryServer connection manager
│   ├── models/
│   │   ├── User.js             # User accounts & address subdocuments
│   │   ├── Product.js          # Products with GST tax rates & inventory
│   │   ├── Category.js         # E-commerce product categories
│   │   ├── Cart.js             # Shopping cart items & applied coupon
│   │   ├── Order.js            # Historical order snapshots & timeline events
│   │   ├── Coupon.js           # Promotional discounts & validation rules
│   │   ├── Payment.js          # Transaction records & signature verification
│   │   ├── Review.js           # Product reviews & rating auto-aggregation
│   │   └── Wishlist.js         # Customer bookmarked products
│   ├── controllers/            # Business logic controllers
│   ├── routes/                 # RESTful API route definitions
│   ├── middleware/             # Auth, RBAC, Rate limiting, Error handling
│   ├── services/
│   │   ├── pricingService.js   # Authoritative calculation engine (GST + Discounts)
│   │   └── razorpayService.js  # Gateway orders & HMAC SHA256 signature verification
│   ├── utils/
│   │   └── seed.js             # Sample realistic products, users & coupons
│   └── tests/
│       └── test_api.js         # 13 automated end-to-end integration test suites
│
├── .env.example                # Environment variable configuration template
├── .env                        # Local active configuration
├── .gitignore                  # Git ignore rules
├── package.json                # Project dependencies and npm scripts
└── README.md                   # Complete documentation
```

---

## ⚡ Quick Start & Installation

### 1. Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create or inspect `.env` (a ready-to-use template is available in `.env.example`):
```env
PORT=5050
NODE_ENV=development

# Database (Leave blank to use automatic in-memory MongoDB, or supply your MongoDB Atlas URI)
MONGODB_URI=

# JWT Secrets
JWT_SECRET=ecommerce_super_secure_jwt_secret_key_2026_antigravity
JWT_EXPIRE=7d
COOKIE_EXPIRE=7

# Razorpay Test Credentials (or use built-in simulator)
RAZORPAY_KEY_ID=rzp_test_demoKeyId123456
RAZORPAY_KEY_SECRET=demoSecretKey987654321
RAZORPAY_SIMULATION_MODE=true

# Store Rules
FREE_SHIPPING_THRESHOLD=999
STANDARD_SHIPPING_FEE=70
EXPRESS_SHIPPING_FEE=150
```

### 4. Seed the Database
Populate 18 realistic products across 6 categories, demo users, coupons, reviews, and sample orders:
```bash
npm run seed
```

### 5. Run the Application
```bash
npm start
```
The server will start at **http://localhost:5050**.

---

## 🔑 Pre-Configured Test Accounts

| Role | Email | Password | Pre-loaded Data |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@shopcart.com` | `Customer@12345` | Saved addresses, order history, reviews |
| **Admin** | `admin@shopcart.com` | `Admin@12345` | Full administrative & analytics privileges |

*Tip: The login page at `http://localhost:5050/login.html` features **1-Click Demo Login** buttons for instant testing.*

---

## 🎟️ Active Promotional Coupons

| Coupon Code | Discount Type | Value | Eligibility Rule |
| :--- | :--- | :--- | :--- |
| `WELCOME10` | Percentage | 10% Off | Max ₹500 off on orders above ₹500 |
| `SAVE200` | Fixed Amount | ₹200 Off | Minimum order spend of ₹1,500 |
| `FREESHIP` | Shipping Waived | Free Delivery | Applicable on any order |
| `FESTIVE25` | Percentage | 25% Off | Max ₹1,000 off on orders above ₹2,000 |

---

## 💳 Razorpay Test Mode & Simulation Integration

1. **Native Razorpay Checkout:**
   If valid test keys (`RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`) from your [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys) are added to `.env`, the official Razorpay Checkout SDK initiates genuine test payments.
2. **Interactive Simulation Mode:**
   When running offline or with demo keys, the built-in modal allows selecting test payment methods (UPI, Card, Net Banking) and sends a verified HMAC signature back to the backend to complete inventory reservation and order creation safely.

---

## 🧪 Automated Testing

Run the end-to-end integration test suite verifying authentication, cart pricing, GST breakdown, coupon discounts, signature verification, stock reservations, order tracking, and RBAC security:

```bash
npm test
```

All 13 test suites execute and report passing assertions.

---

## 🚀 Production Deployment

1. Set `NODE_ENV=production` in `.env`.
2. Connect your production MongoDB cluster string in `MONGODB_URI` (e.g., MongoDB Atlas).
3. Insert your live/test Razorpay API credentials.
4. Deploy to any Node.js hosting platform (Render, Railway, AWS ECS, DigitalOcean, Heroku) by running `npm start`.
