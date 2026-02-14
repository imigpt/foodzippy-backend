import mongoose from 'mongoose';

const franchiseInquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'in-progress', 'approved', 'rejected'],
      default: 'pending',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index for searching
franchiseInquirySchema.index({ name: 1, email: 1, phone: 1 });
franchiseInquirySchema.index({ status: 1 });
franchiseInquirySchema.index({ createdAt: -1 });

const FranchiseInquiry = mongoose.model('FranchiseInquiry', franchiseInquirySchema);

export default FranchiseInquiry;
