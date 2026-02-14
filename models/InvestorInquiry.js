import mongoose from 'mongoose';

const investorInquirySchema = new mongoose.Schema(
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
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: '',
    },
    investorAmount: {
      type: String,
      trim: true,
      required: [true, 'Investment amount is required'],
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
investorInquirySchema.index({ name: 1, email: 1, phone: 1 });
investorInquirySchema.index({ city: 1, state: 1 });
investorInquirySchema.index({ status: 1 });
investorInquirySchema.index({ createdAt: -1 });

const InvestorInquiry = mongoose.model('InvestorInquiry', investorInquirySchema);

export default InvestorInquiry;
