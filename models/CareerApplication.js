import mongoose from 'mongoose';

const careerApplicationSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
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
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    message: {
      type: String,
      default: '',
      trim: true,
    },
    resumeUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'shortlisted', 'rejected', 'hired'],
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

careerApplicationSchema.index({ fullName: 1, email: 1, phone: 1 });
careerApplicationSchema.index({ status: 1 });
careerApplicationSchema.index({ position: 1 });
careerApplicationSchema.index({ createdAt: -1 });

const CareerApplication = mongoose.model('CareerApplication', careerApplicationSchema);

export default CareerApplication;
