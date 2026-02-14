import mongoose from 'mongoose';

const VendorFormConfigSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      required: true,
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
    label: {
      type: String,
      required: true,
    },
    fieldKey: {
      type: String,
      required: true,
      unique: true,
    },
    fieldType: {
      type: String,
      required: true,
      enum: [
        'text',
        'email',
        'password',
        'number',
        'textarea',
        'select',
        'multi_select',
        'checkbox',
        'boolean',
        'file',
        'map',
        'date',
        'voice'
      ],
    },
    options: {
      type: [String],
      default: [],
    },
    placeholder: {
      type: String,
      default: '',
    },
    required: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      required: true,
    },
    visibleTo: {
      type: [String],
      enum: ['agent', 'employee'],
      default: ['agent', 'employee'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    validation: {
      minLength: Number,
      maxLength: Number,
      min: Number,
      max: Number,
      pattern: String,
    },
    helpText: {
      type: String,
      default: '',
    },
    isSystemField: {
      type: Boolean,
      default: false, // System fields cannot be deleted (e.g., restaurantName, restaurantImage)
    },
    vendorTypes: {
      type: [String],
      default: [], // Empty array means applies to all vendor types
    },
    labelTemplate: {
      type: String,
      default: '', // Template for dynamic labels e.g., "{type} Name" where {type} gets replaced
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
VendorFormConfigSchema.index({ section: 1, order: 1 });
VendorFormConfigSchema.index({ vendorTypes: 1 });

const VendorFormConfig = mongoose.model('VendorFormConfig', VendorFormConfigSchema);

export default VendorFormConfig;
