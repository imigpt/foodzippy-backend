import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

async function reset() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodzippy';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB:', uri.startsWith('mongodb://localhost') ? 'local' : 'remote');

    // Find and update by loading user and saving to trigger pre-save hook (hashing)
    const agent = await User.findOne({ username: 'testagent' });
    if (agent) {
      agent.password = 'agent123';
      await agent.save();
      console.log('✅ Reset testagent password to agent123');
    } else {
      console.log('testagent not found');
    }

    const emp = await User.findOne({ username: 'testemployee' });
    if (emp) {
      emp.password = 'employee123';
      await emp.save();
      console.log('✅ Reset testemployee password to employee123');
    } else {
      console.log('testemployee not found');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

reset();
