const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('./src/models/User');

/**
 * Admin User Seeder
 * 
 * This script creates an admin user in the database.
 * Run this ONCE to create your first admin user.
 * 
 * Usage:
 *   node seedAdmin.js
 * 
 * Default credentials:
 *   Email: admin@faydatech.com
 *   Password: 123password
 */

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ Error: MONGODB_URI not found in environment variables');
      console.log('Please set MONGODB_URI in your .env file');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Default admin credentials for Fayda Tech
    const adminEmail = 'admin@faydatech.com';
    const adminPassword = '123password';
    const adminName = 'Fayda Tech Admin';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Name:', existingAdmin.name);
      console.log('🎭 Role:', existingAdmin.role);
      console.log('📅 Created:', existingAdmin.createdAt);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('✅ You can use these credentials to login:');
      console.log('   Email: admin@faydatech.com');
      console.log('   Password: 123password\n');
      
      await mongoose.connection.close();
      process.exit(0);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    console.log('👤 Creating admin user...');
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin'
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('👤 Name:', adminName);
    console.log('🎭 Role:', admin.role);
    console.log('🆔 ID:', admin._id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎉 Setup Complete!');
    console.log('\nYou can now login at POST /api/auth/login with:');
    console.log('  Email: admin@faydatech.com');
    console.log('  Password: 123password\n');
    console.log('⚠️  IMPORTANT: Change the password in production!\n');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.code === 11000) {
      console.log('\n💡 Tip: An admin with this email already exists.');
      console.log('The admin user is already set up and ready to use.\n');
    }
    
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seeder
console.log('🚀 Fayda Tech - Admin User Seeder');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

seedAdmin();