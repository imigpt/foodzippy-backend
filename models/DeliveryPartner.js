import mongoose from 'mongoose';

const deliveryPartnerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    approvedBy: {
      type: String,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    loginId: {
      type: String,
      unique: true,
      sparse: true,
    },
    passwordHash: {
      type: String,
    },
  },
  { timestamps: true }
);

// Prevent duplicate applications by email
deliveryPartnerSchema.index({ email: 1 }, { unique: true });

export default mongoose.model('DeliveryPartner', deliveryPartnerSchema);
