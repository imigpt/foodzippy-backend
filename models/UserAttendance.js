import mongoose from 'mongoose';

const userAttendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['agent', 'employee'],
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // in minutes
      default: 0,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Half-Day', 'Leave'],
      default: 'Present',
    },
    remark: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      checkInLocation: {
        latitude: Number,
        longitude: Number,
        address: String,
      },
      checkOutLocation: {
        latitude: Number,
        longitude: Number,
        address: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index - one attendance record per user per day
userAttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

// Calculate duration before saving
userAttendanceSchema.pre('save', function (next) {
  if (this.checkIn && this.checkOut) {
    const durationMs = this.checkOut - this.checkIn;
    this.duration = Math.floor(durationMs / (1000 * 60)); // Convert to minutes
    
    // Determine status based on duration
    if (this.duration < 240) { // Less than 4 hours
      this.status = 'Half-Day';
    } else {
      this.status = 'Present';
    }
  }
  next();
});

const UserAttendance = mongoose.model('UserAttendance', userAttendanceSchema);

export default UserAttendance;
