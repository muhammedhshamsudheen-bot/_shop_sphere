/**
 * Full End-to-End API Integration Test Suite
 */
require('dotenv').config();
const http = require('http');
const app = require('../app');
const { connectDB, disconnectDB } = require('../config/database');
const { seedInitialData } = require('../utils/seed');

let server;
let baseUrl;

async function runTests() {
  console.log('\n--- 🧪 STARTING E-COMMERCE END-TO-END TEST SUITE ---');

  await connectDB();
  await seedInitialData();

  await new Promise(resolve => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server running on ${baseUrl}`);
      resolve();
    });
  });

  try {
    let customerToken = '';
    let adminToken = '';
    let cartItemId = '';
    let sampleProductId = '';

    // Test 1: Store Config
    console.log('\nTest 1: GET /api/config');
    const configRes = await fetch(`${baseUrl}/api/config`);
    const configData = await configRes.json();
    assert(configRes.status === 200, 'Config should return 200');
    assert(configData.currency === 'INR', 'Currency should be INR');
    console.log('✅ Store config verified');

    // Test 2: Login customer
    console.log('\nTest 2: POST /api/auth/login (Customer)');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@shopcart.com', password: 'Customer@12345' })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Customer login should succeed');
    customerToken = loginData.token;
    assert(Boolean(customerToken), 'Customer token must be returned');
    console.log('✅ Customer login verified');

    // Test 3: Login admin
    console.log('\nTest 3: POST /api/auth/login (Admin)');
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@shopcart.com', password: 'Admin@12345' })
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, 'Admin login should succeed');
    assert(adminLoginData.user.role === 'admin', 'Role must be admin');
    adminToken = adminLoginData.token;
    console.log('✅ Admin login verified');

    // Test 4: Product Catalog & Search
    console.log('\nTest 4: GET /api/products?search=Sony');
    const searchRes = await fetch(`${baseUrl}/api/products?search=Sony`);
    const searchData = await searchRes.json();
    assert(searchRes.status === 200, 'Search should return 200');
    assert(searchData.products.length > 0, 'Should find Sony product');
    sampleProductId = searchData.products[0]._id;
    console.log(`✅ Products search verified (Found: ${searchData.products[0].title})`);

    // Test 5: Add to Cart
    console.log('\nTest 5: POST /api/cart/items');
    const cartRes = await fetch(`${baseUrl}/api/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        productId: sampleProductId,
        quantity: 1,
        color: 'Midnight Black'
      })
    });
    const cartData = await cartRes.json();
    assert(cartRes.status === 200, 'Adding to cart should succeed');
    assert(cartData.cart.items.length === 1, 'Cart should contain 1 item');
    console.log('✅ Cart add item verified');

    // Test 6: Apply Coupon WELCOME10
    console.log('\nTest 6: POST /api/cart/coupon');
    const couponRes = await fetch(`${baseUrl}/api/cart/coupon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({ code: 'WELCOME10' })
    });
    const couponData = await couponRes.json();
    assert(couponRes.status === 200, 'Coupon application should succeed');
    assert(couponData.cart.couponDiscount > 0, 'Coupon discount should be applied');
    console.log(`✅ Coupon applied: ₹${couponData.cart.couponDiscount} discount`);

    // Test 7: Authoritative Pricing & Tax Breakdown
    console.log('\nTest 7: Authoritative GST calculation check');
    assert(couponData.cart.taxBreakdown.totalTax > 0, 'GST tax must be calculated');
    assert(couponData.cart.taxBreakdown.cgst === couponData.cart.taxBreakdown.sgst, 'CGST and SGST should be equal');
    console.log(`✅ Authoritative GST breakdown verified (Total Tax: ₹${couponData.cart.taxBreakdown.totalTax})`);

    // Test 8: Checkout Quote
    console.log('\nTest 8: POST /api/checkout/quote');
    const quoteRes = await fetch(`${baseUrl}/api/checkout/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({ deliveryMethod: 'standard' })
    });
    const quoteData = await quoteRes.json();
    assert(quoteRes.status === 200, 'Quote should succeed');
    console.log(`✅ Checkout quote verified: Final Total = ₹${quoteData.quote.finalTotal}`);

    // Test 9: Create Razorpay Order
    console.log('\nTest 9: POST /api/payments/create-order');
    const payOrderRes = await fetch(`${baseUrl}/api/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({ deliveryMethod: 'standard' })
    });
    const payOrderData = await payOrderRes.json();
    assert(payOrderRes.status === 200, 'Payment order creation should succeed');
    assert(Boolean(payOrderData.razorpayOrderId), 'Razorpay order ID should be returned');
    console.log(`✅ Razorpay order created: ${payOrderData.razorpayOrderId}`);

    // Test 10: Verify Payment and Place Order
    console.log('\nTest 10: POST /api/payments/verify');
    const verifyRes = await fetch(`${baseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        razorpayOrderId: payOrderData.razorpayOrderId,
        razorpayPaymentId: `pay_${Date.now()}`,
        razorpaySignature: 'sim_sig_verified_flow',
        shippingAddress: {
          fullName: 'Muhammed Shamsu',
          phone: '+91 9846012345',
          street: '15 Crescent Marine Drive',
          city: 'Kochi',
          state: 'Kerala',
          postalCode: '682011'
        },
        deliveryMethod: 'standard',
        paymentMethod: 'UPI'
      })
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 201, 'Payment verification and order creation should return 201');
    assert(verifyData.order.orderStatus === 'Confirmed', 'Order should be Confirmed');
    assert(verifyData.order.paymentStatus === 'paid', 'Order paymentStatus should be paid');
    const createdOrderId = verifyData.order._id;
    console.log(`✅ Order verified & placed: ${verifyData.order.orderNumber}`);

    // Test 11: Customer Order Details & Tracking
    console.log('\nTest 11: GET /api/orders/:id');
    const getOrderRes = await fetch(`${baseUrl}/api/orders/${createdOrderId}`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const getOrderData = await getOrderRes.json();
    assert(getOrderRes.status === 200, 'Order fetch should succeed');
    assert(getOrderData.order.timeline.length > 0, 'Order timeline should have events');
    console.log(`✅ Order tracking timeline verified (${getOrderData.order.timeline[0].status})`);

    // Test 12: Admin Dashboard Metrics
    console.log('\nTest 12: GET /api/admin/dashboard');
    const adminDashRes = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminDashData = await adminDashRes.json();
    assert(adminDashRes.status === 200, 'Admin dashboard should return 200');
    assert(adminDashData.stats.totalOrders >= 2, 'Admin stats total orders should be >= 2');
    console.log(`✅ Admin dashboard metrics verified (Revenue: ₹${adminDashData.stats.totalRevenue}, Orders: ${adminDashData.stats.totalOrders})`);

    // Test 13: Customer RBAC protection (Customer cannot access admin)
    console.log('\nTest 13: RBAC check - customer accessing /api/admin/dashboard should fail with 403');
    const unauthorizedRes = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert(unauthorizedRes.status === 403, 'Customer should receive 403 Forbidden on admin route');
    console.log('✅ RBAC permission barrier verified');

    // Test 14: Shipping PIN code delivery estimate
    console.log('\nTest 14: GET /api/shipping/estimate?pincode=682011');
    const shippingRes = await fetch(`${baseUrl}/api/shipping/estimate?pincode=682011`);
    const shippingData = await shippingRes.json();
    assert(shippingRes.status === 200, 'Shipping estimate should return 200');
    assert(shippingData.serviceable === true, 'Pincode 682011 should be serviceable');
    assert(shippingData.delivery?.standard?.formatted, 'Standard delivery formatted date should be present');
    assert(shippingData.delivery?.express?.formatted, 'Express delivery formatted date should be present');
    console.log(`✅ PIN delivery estimate verified: ${shippingData.location.city} (Standard: ${shippingData.delivery.standard.formatted}, Express: ${shippingData.delivery.express.formatted})`);

    console.log('\n🎉 ALL 14 TEST SUITES PASSED FLAWLESSLY!\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await disconnectDB();
    process.exit(0);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

runTests();
