import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    // Type of notification
    type: {
      type: String,
      enum: ['follow_up_update', 'status_update'],
      required: true,
      index: true,
    },

    // Reference to the vendor
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },

    // User who made the update (agent/employee)
    updatedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      userName: {
        type: String,
        required: true,
      },
      userRole: {
        type: String,
        enum: ['agent', 'employee'],
        required: true,
      },
    },

    // Notification details
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },

    // Follow-up date that was updated
    followUpDate: {
      oldDate: {
        type: Date,
      },
      newDate: {
        type: Date,
      },
    },

    // Vendor details for quick access
    vendorDetails: {
      restaurantName: {
        type: String,
        required: true,
      },
      restaurantStatus: {
        type: String,
        enum: ['pending', 'publish', 'reject'],
      },
    },

    // Read status
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
