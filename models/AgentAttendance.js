import mongoose from 'mongoose';

const agentAttendanceSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      index: true,
    },
    agentName: {
      type: String,
      required: true,
      trim: true,
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

// Compound unique index - one attendance record per agent per day
agentAttendanceSchema.index({ agentId: 1, date: 1 }, { unique: true });

// Calculate duration before saving
agentAttendanceSchema.pre('save', function (next) {
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

const AgentAttendance = mongoose.model('AgentAttendance', agentAttendanceSchema);

export default AgentAttendance;
