const mongoose = require('mongoose');


const connectDB = async () => {
  try {
    console.log('MONGODB_URI present:', !!process.env.MONGODB_URI);
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
     
      maxPoolSize: 10, // maximum users that can access the database concurretnly 
      serverSelectionTimeoutMS: 5000, // If the Server Selection takes more than 5 it will reset
      socketTimeoutMS: 45000, // After the connection if the back and fourths take more than 45secs it will abort
    });

    console.log(`MongoDB connected: ${conn.connection.host}`);

    // connection events
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from MongoDB');
    });


    process.on('SIGINT', async () => {
      console.log('SIGINT received, stack trace follow:\n', new Error().stack);
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('MongoDB connection Failed:', error.message);
    // Retry connection after 5 seconds
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;