require('dotenv').config();
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/database');
const Product = require('./models/Product');
const { seedInitialData } = require('./utils/seed');

const PORT = process.env.PORT || 5000;

let server;

async function startServer() {
  try {
    await connectDB();

    // Auto-seed if database is brand new (0 products)
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log('[System] Database is empty. Auto-seeding initial store data...');
      await seedInitialData();
    }

    server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 ShopSphere E-Commerce Server is running!`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🛒 Storefront: http://localhost:${PORT}/index.html`);
      console.log(`⚙️ Admin Dashboard: http://localhost:${PORT}/admin.html`);
      console.log(`🔐 Admin: admin@shopcart.com / Admin@12345`);
      console.log(`👤 Customer: customer@shopcart.com / Customer@12345`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down server gracefully...');
  if (server) {
    server.close(async () => {
      await disconnectDB();
      console.log('Server and database connections terminated cleanly.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer();
