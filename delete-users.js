import mongoose from 'mongoose';
import User from './models/User.js';

const deleteAllUsers = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/foodzippy');
    console.log('Connected to MongoDB');
    
    await User.deleteMany({});
    console.log('✅ All users deleted');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

deleteAllUsers();
