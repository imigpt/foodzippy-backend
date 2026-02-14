import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vendor from './models/Vendor.js';

dotenv.config();

const fixEditRequests = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    // Find all vendors with pending edit requests that don't have editSeenByAdmin set to false
    const result = await Vendor.updateMany(
      {
        editRequested: true,
        editApproved: false,
        $or: [
          { editSeenByAdmin: { $ne: false } },
          { editSeenByAdmin: { $exists: false } }
        ]
      },
      {
        $set: { editSeenByAdmin: false }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} edit requests to be marked as unseen`);

    // Show current pending edit requests count
    const pendingCount = await Vendor.countDocuments({
      editRequested: true,
      editApproved: false,
      editSeenByAdmin: false
    });

    console.log(`📊 Total unseen pending edit requests: ${pendingCount}`);

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error fixing edit requests:', error);
    process.exit(1);
  }
};

fixEditRequests();
