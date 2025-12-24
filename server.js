const app = require('./src/app');//Gets the express App
const connectDB = require('./src/config/database');
require('dotenv').config();

// Monogo Connnect  
connectDB();

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});