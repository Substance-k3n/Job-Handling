const mongoose = require('mongoose');

/**
 * Connect to MongoDB using ONLY process.env.MONGODB_URI.
 * Throws if MONGODB_URI is missing or if connection fails.
 * Deprecated mongoose options have been removed.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Set the environment variable before starting the app.');
  }

  try {
    console.log('Connecting to MongoDB using MONGODB_URI');

    const conn = await mongoose.connect(uri, {
      // Removed deprecated options: useNewUrlParser / useUnifiedTopology
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from MongoDB');
    });

    // graceful shutdown
    const onSig = async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed due to app termination');
      } catch (err) {
        console.error('Error closing MongoDB connection on shutdown:', err);
      } finally {
        process.exit(0);
      }
    };

    process.once('SIGINT', onSig);
    process.once('SIGTERM', onSig);

    return conn;
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    // Do not retry silently; fail fast so caller can decide to retry or exit.
    throw err;
  }
};

module.exports = connectDB;