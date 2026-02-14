import mongoose from 'mongoose';
import User from './models/User.js';
import bcrypt from 'bcryptjs';

const createTestUsers = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/foodzippy');
    console.log('Connected to MongoDB');
    
    // Create a test agent
    const agentPassword = await bcrypt.hash('agent123', 10);
    const testAgent = new User({
      name: 'Test Agent',
      username: 'testagent',
      password: agentPassword,
      phone: '1111111111',
      role: 'agent',
      isActive: true
    });
    await testAgent.save();
    console.log('✅ Test agent created: username=testagent, password=agent123');
    
    // Create a test employee
    const employeePassword = await bcrypt.hash('employee123', 10);
    const testEmployee = new User({
      name: 'Test Employee',
      username: 'testemployee',
      password: employeePassword,
      phone: '2222222222',
      role: 'employee',
      isActive: true
    });
    await testEmployee.save();
    console.log('✅ Test employee created: username=testemployee, password=employee123');
    
    // Also recreate the bhairavam12 employee
    const bhairavPassword = await bcrypt.hash('password123', 10);
    const bhairavam = new User({
      name: 'Bhairavam',
      username: 'bhairavam12',
      password: bhairavPassword,
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
