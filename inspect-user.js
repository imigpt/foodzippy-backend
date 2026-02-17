import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

async function inspect() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodzippy';
    await mongoose.connect(uri);
    console.log('Connected to DB:', uri);
    const user = await User.findOne({ username: 'testagent' }).lean();
    console.log('User:', user);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspect();
