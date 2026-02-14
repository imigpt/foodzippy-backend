import mongoose from 'mongoose';

const VendorFormSectionSchema = new mongoose.Schema(
  {
    sectionKey: {
      type: String,
      required: true,
      unique: true,
      enum: [
        'restaurant_info',
        'login_info',
        'category_info',
        'address_info',
        'delivery_charge_type',
        'delivery_info',
        'commission_info',
        'payout_info',
        'review_info'
      ],
    },
    sectionLabel: {
      type: String,
      required: true,
    },
    sectionDescription: {
      type: String,
      default: '',
    },
    order: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    stepNumber: {
      type: Number, // For multi-step forms (STEP 1, STEP 2)
      required: true,
    },
    visibleTo: {
      type: [String],
      enum: ['agent', 'employee'],
      default: ['agent', 'employee'],
    },
    vendorTypes: {
      type: [String],
      default: [], // Empty array means applies to all vendor types
    },
    labelTemplate: {
      type: String,
      default: '', // Template for dynamic labels e.g., "{type} Information"
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
VendorFormSectionSchema.index({ stepNumber: 1, order: 1 });

const VendorFormSection = mongoose.model('VendorFormSection', VendorFormSectionSchema);

export default VendorFormSection;
