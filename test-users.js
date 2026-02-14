import mongoose from 'mongoose';
import User from './models/User.js';

const checkUsers = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/foodzippy');
    console.log('Connected to MongoDB');
    
    const users = await User.find({});
    console.log('\n=== USERS IN DATABASE ===');
    console.log(`Total users: ${users.length}\n`);
    
    users.forEach(user => {
      console.log(`Username: ${user.username}`);
      console.log(`Role: ${user.role}`);
      console.log(`Name: ${user.name}`);
      console.log(`Active: ${user.isActive}`);
      console.log(`Created: ${user.createdAt}`);
      console.log('---');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkUsers();
