import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    // ==========================================
    // DYNAMIC FORM DATA (All form fields go here)
    // ==========================================
    formData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ==========================================
    // VENDOR TYPE (New field)
    // ==========================================
    vendorType: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      default: 'restaurant',
      index: true,
    },

    // ==========================================
    // CORE SYSTEM FIELDS (Non-configurable)
    // ==========================================
    restaurantName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    restaurantImage: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    restaurantStatus: {
      type: String,
      enum: ['pending', 'publish', 'reject'],
      default: 'pending',
      index: true,
    },
    isSeenByAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
    fullAddress: {
      type: String,
      required: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },

    // ==========================================
    // REVIEW SECTION (Structured but Configurable)
    // ==========================================
    review: {
      followUpDate: {
        type: Date,
      },
      convincingStatus: {
        type: String,
        enum: ['convenience', 'convertible', 'not_convertible'],
      },
      behavior: {
        type: String,
        enum: ['excellent', 'good', 'rude'],
      },
      audioUrl: {
        type: String, // Cloudinary URL for voice recording
        trim: true,
      },
    },

    // ==========================================
    // USER TRACKING (Who created this vendor)
    // ==========================================
    createdByName: {
      type: String,
      trim: true,
    },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdByUsername: {
      type: String,
      trim: true,
    },
    createdByRole: {
      type: String,
      enum: ['agent', 'employee'],
      trim: true,
    },

    // ==========================================
    // EDIT REQUEST MANAGEMENT
    // ==========================================
    editRequested: {
      type: Boolean,
      default: false,
    },
    editApproved: {
      type: Boolean,
      default: false,
    },
    editRequestDate: {
      type: Date,
      default: null,
    },
    editApprovalDate: {
      type: Date,
      default: null,
    },
    editRemark: {
      type: String,
      trim: true,
      default: '',
    },
    editSeenByAdmin: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // VENDOR LISTING CHARGE
    // ==========================================
    listingType: {
      type: String,
      enum: ['launching', 'vip', 'normal'],
      default: 'launching',
      index: true,
    },
    listingCharge: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // PAYMENT TRACKING
    // ==========================================
    paymentCategory: {
      type: String,
      enum: ['A', 'B', 'C', 'D'],
      default: null,
      index: true,
    },
    visitStatus: {
      type: String,
      enum: [
        'pending-visit',              // Not visited yet
        'visited-onboarded',          // Onboarded on first visit
        'visited-rejected',           // Rejected on first visit
        'visited-followup-scheduled', // Follow-up scheduled
        'followup-onboarded',         // Onboarded after follow-up
        'followup-rejected',          // Rejected after follow-up
        'followup-2nd-scheduled',     // 2nd follow-up scheduled
        '2nd-followup-onboarded',     // Onboarded after 2nd follow-up
        '2nd-followup-rejected',      // Rejected after 2nd follow-up
      ],
      default: 'pending-visit',
      index: true,
    },
    followUpDate: {
      type: Date,
      default: null,
      index: true,
    },
    secondFollowUpDate: {
      type: Date,
      default: null,
    },
    agentFollowUpUpdate: {
      visitedOn: { type: Date },
      outcome: { type: String, enum: ['onboarded', 'rejected', '2nd-followup', null] },
      remarks: { type: String },
      nextFollowUpDate: { type: Date },
      updatedAt: { type: Date },
    },
    followUpHistory: [{
      date: { type: Date },
      outcome: { type: String },
      remarks: { type: String },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      updatedAt: { type: Date, default: Date.now },
    }],
    totalPaymentDue: {
      type: Number,
      default: 0,
    },
    totalPaymentPaid: {
      type: Number,
      default: 0,
    },
    paymentCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast queries
vendorSchema.index({ createdById: 1, visitStatus: 1 }); // Agent's vendors by status
vendorSchema.index({ createdById: 1, followUpDate: 1 }); // Agent's follow-ups
vendorSchema.index({ visitStatus: 1, followUpDate: 1 }); // Admin follow-up tracking
vendorSchema.index({ paymentCategory: 1, paymentCompleted: 1 }); // Payment reports

const Vendor = mongoose.model('Vendor', vendorSchema);

export default Vendor;
