import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const createTestUsers = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodzippy';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB:', uri.startsWith('mongodb://localhost') ? 'local' : 'remote');
    
    // Create a test agent (provide plain password so pre-save hook hashes it once)
    const testAgent = new User({
      name: 'Test Agent',
      username: 'testagent',
      password: 'agent123',
      phone: '1111111111',
      role: 'agent',
      isActive: true
    });
    await testAgent.save();
    console.log('✅ Test agent created: username=testagent, password=agent123');
    
    // Create a test employee
    const testEmployee = new User({
      name: 'Test Employee',
      username: 'testemployee',
      password: 'employee123',
      phone: '2222222222',
      role: 'employee',
      isActive: true
    });
    await testEmployee.save();
    console.log('✅ Test employee created: username=testemployee, password=employee123');
    
    // Also recreate the bhairavam12 employee
    const bhairavam = new User({
      name: 'Bhairavam',
      username: 'bhairavam12',
      password: 'password123',
      phone: '1234567890',
      role: 'employee',
      isActive: true
    });
    await bhairavam.save();
    console.log('✅ Employee bhairavam12 created: username=bhairavam12, password=password123');
    
    console.log('\n=== ALL TEST USERS CREATED ===');
    console.log('Agent: testagent / agent123');
    console.log('Employee: testemployee / employee123');
    console.log('Employee: bhairavam12 / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createTestUsers();
