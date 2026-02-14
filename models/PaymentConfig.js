import mongoose from 'mongoose';

const paymentConfigSchema = new mongoose.Schema(
  {
    categoryA: {
      visit: { type: Number, default: 70 },
      followup: { type: Number, default: 70 },
      onboarding: { type: Number, default: 700 },
    },
    categoryB: {
      visit: { type: Number, default: 50 },
      followup: { type: Number, default: 50 },
      onboarding: { type: Number, default: 500 },
    },
    categoryC: {
      visit: { type: Number, default: 35 },
      followup: { type: Number, default: 35 },
      onboarding: { type: Number, default: 350 },
    },
    categoryD: {
      visit: { type: Number, default: 20 },
      followup: { type: Number, default: 20 },
      onboarding: { type: Number, default: 200 },
    },
    updatedBy: {
      type: String,
      default: 'admin',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one config document exists
paymentConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne().lean();
  if (!config) {
    config = await this.create({});
    config = config.toObject();
  }
  
  // Return normalized format with categories object for frontend
  return {
    ...config,
    categories: {
      A: config.categoryA,
      B: config.categoryB,
      C: config.categoryC,
      D: config.categoryD,
    },
  };
};

const PaymentConfig = mongoose.model('PaymentConfig', paymentConfigSchema);

export default PaymentConfig;
