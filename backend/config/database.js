const mongoose = require('mongoose');

let mongodInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI && process.env.MONGODB_URI.trim();

  if (uri) {
    try {
      console.log(`[DB] Attempting connection to configured MongoDB: ${uri.replace(/\/\/.*@/, '//***:***@')}`);
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`[DB] Connected to MongoDB: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.warn(`[DB] Failed to connect to ${uri}: ${err.message}`);
      console.warn('[DB] Falling back to high-performance in-memory MongoDB...');
    }
  }

  // Fallback to MongoMemoryServer
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongodInstance = await MongoMemoryServer.create({
      instance: {
        dbName: 'shopcart'
      }
    });
    const memoryUri = mongodInstance.getUri();
    console.log(`[DB] Starting MongoMemoryServer at: ${memoryUri}`);
    const conn = await mongoose.connect(memoryUri);
    console.log(`[DB] Connected to MongoMemoryServer: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`[DB] Critical: Failed to initialize in-memory database: ${err.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
};

module.exports = { connectDB, disconnectDB };
