import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // Fast agent-based queries
    },
    agentName: {
      type: String,
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true, // Fast vendor-based queries
    },
    vendorName: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['A', 'B', 'C', 'D'],
      required: true,
      index: true, // Fast category filtering
    },
    paymentType: {
      type: String,
      enum: ['visit', 'followup', 'visit-followup', 'onboarding', 'balance'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    visitStatus: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
      index: true, // Fast status filtering
    },
    paidDate: {
      type: Date,
      default: null,
    },
    paidBy: {
      type: String,
      default: null,
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast queries
paymentSchema.index({ agentId: 1, paymentStatus: 1 }); // Agent's pending/paid payments
paymentSchema.index({ agentId: 1, createdAt: -1 }); // Agent's payment history
paymentSchema.index({ paymentStatus: 1, createdAt: -1 }); // Admin payment list
paymentSchema.index({ createdAt: -1 }); // Recent payments

// Static method to get agent's total earnings
paymentSchema.statics.getAgentEarnings = async function (agentId, startDate, endDate) {
  const match = { agentId: new mongoose.Types.ObjectId(agentId) };
  
  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$paymentStatus',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const earnings = { pending: 0, paid: 0, pendingCount: 0, paidCount: 0 };
  result.forEach((r) => {
    if (r._id === 'pending') {
      earnings.pending = r.total;
      earnings.pendingCount = r.count;
    } else if (r._id === 'paid') {
      earnings.paid = r.total;
      earnings.paidCount = r.count;
    }
  });

  return earnings;
};

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
