import Payment from '../models/Payment.js';
import PaymentConfig from '../models/PaymentConfig.js';
import Vendor from '../models/Vendor.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { createFollowUpNotification, createStatusUpdateNotification } from './notification.controller.js';

// ==========================================
// PAYMENT CONFIG APIs (Admin)
// ==========================================

// @desc    Get payment configuration
// @route   GET /api/admin/payment-config
// @access  Private (Admin)
export const getPaymentConfig = async (req, res) => {
  try {
    const config = await PaymentConfig.getConfig();
    res.status(200).json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Get payment config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment config',
      error: error.message,
    });
  }
};

// @desc    Update payment configuration
// @route   PUT /api/admin/payment-config
// @access  Private (Admin)
export const updatePaymentConfig = async (req, res) => {
  try {
    const { categoryA, categoryB, categoryC, categoryD } = req.body;

    let config = await PaymentConfig.findOne();
    if (!config) {
      config = new PaymentConfig();
    }

    if (categoryA) config.categoryA = { ...config.categoryA, ...categoryA };
    if (categoryB) config.categoryB = { ...config.categoryB, ...categoryB };
    if (categoryC) config.categoryC = { ...config.categoryC, ...categoryC };
    if (categoryD) config.categoryD = { ...config.categoryD, ...categoryD };
    config.updatedBy = 'admin';

    await config.save();

    res.status(200).json({
      success: true,
      message: 'Payment config updated successfully',
      config,
    });
  } catch (error) {
    console.error('Update payment config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment config',
      error: error.message,
    });
  }
};

// ==========================================
// PAYMENT CALCULATION HELPER
// ==========================================

const calculatePaymentAmount = (category, visitStatus, alreadyPaid, config) => {
  // Support both formats: config.categoryA or config.categories.A
  const rates = config[`category${category}`] || config.categories?.[category];
  if (!rates) return { amount: 0, paymentType: 'none' };

  let amount = 0;
  let paymentType = 'none';

  switch (visitStatus) {
    case 'visited-onboarded':
      // Immediate onboarding on first visit
      amount = rates.onboarding - alreadyPaid;
      paymentType = 'onboarding';
      break;

    case 'visited-rejected':
      // Only visit charge
      amount = rates.visit - alreadyPaid;
      paymentType = 'visit';
      break;

    case 'visited-followup-scheduled':
      // Visit + follow-up charge (paid immediately)
      amount = (rates.visit + rates.followup) - alreadyPaid;
      paymentType = 'visit-followup';
      break;

    case 'followup-onboarded':
    case '2nd-followup-onboarded':
      // Balance to reach onboarding amount
      amount = rates.onboarding - alreadyPaid;
      paymentType = 'balance';
      break;

    case 'followup-rejected':
    case 'followup-2nd-scheduled':
    case '2nd-followup-rejected':
      // No additional payment
      amount = 0;
      paymentType = 'none';
      break;

    default:
      amount = 0;
      paymentType = 'none';
  }

  return {
    amount: Math.max(0, amount), // Ensure no negative
    paymentType,
  };
};

// ==========================================
// VENDOR PAYMENT STATUS UPDATE (Admin)
// ==========================================

// @desc    Update vendor category and visit status (triggers payment calculation)
// @route   PATCH /api/admin/vendors/:id/payment-status
// @access  Private (Admin)
export const updateVendorPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentCategory, visitStatus, followUpDate, secondFollowUpDate, remarks } = req.body;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Get payment config
    const config = await PaymentConfig.getConfig();

    // Store previous status
    const previousStatus = vendor.visitStatus;
    const previousPaid = vendor.totalPaymentPaid || 0;

    // Update vendor fields
    if (paymentCategory) vendor.paymentCategory = paymentCategory;
    if (visitStatus) vendor.visitStatus = visitStatus;
    if (followUpDate) vendor.followUpDate = new Date(followUpDate);
    if (secondFollowUpDate) vendor.secondFollowUpDate = new Date(secondFollowUpDate);

    // Calculate payment if category and status are set
    let newPayment = null;
    if (vendor.paymentCategory && visitStatus && visitStatus !== previousStatus) {
      const calculation = calculatePaymentAmount(
        vendor.paymentCategory,
        visitStatus,
        previousPaid,
        config
      );

      if (calculation.amount > 0) {
        // Create payment record
        newPayment = await Payment.create({
          agentId: vendor.createdById,
          agentName: vendor.createdByName || 'Unknown',
          vendorId: vendor._id,
          vendorName: vendor.restaurantName,
          category: vendor.paymentCategory,
          paymentType: calculation.paymentType,
          amount: calculation.amount,
          visitStatus: visitStatus,
          paymentStatus: 'pending',
          remarks: remarks || '',
        });

        // Update vendor payment tracking
        vendor.totalPaymentDue = (vendor.totalPaymentDue || 0) + calculation.amount;
        vendor.totalPaymentPaid = previousPaid + calculation.amount;
      }

      // Mark payment as completed for final statuses
      if (['visited-onboarded', 'visited-rejected', 'followup-onboarded', 
           'followup-rejected', '2nd-followup-onboarded', '2nd-followup-rejected'].includes(visitStatus)) {
        vendor.paymentCompleted = true;
      }
    }

    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Vendor payment status updated',
      paymentCreated: !!newPayment,
      paymentAmount: newPayment ? newPayment.amount : 0,
      paymentType: newPayment ? newPayment.paymentType : 'none',
      vendor: {
        _id: vendor._id,
        restaurantName: vendor.restaurantName,
        paymentCategory: vendor.paymentCategory,
        visitStatus: vendor.visitStatus,
        followUpDate: vendor.followUpDate,
        totalPaymentDue: vendor.totalPaymentDue || 0,
        totalPaymentPaid: vendor.totalPaymentPaid || 0,
        paymentCompleted: vendor.paymentCompleted,
      },
      newPayment,
    });
  } catch (error) {
    console.error('Update vendor payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vendor payment status',
      error: error.message,
    });
  }
};

// ==========================================
// PAYMENT MANAGEMENT APIs (Admin)
// ==========================================

// @desc    Get all payments (with filters)
// @route   GET /api/admin/payments
// @access  Private (Admin)
export const getAllPayments = async (req, res) => {
  try {
    const { 
      status, 
      agentId, 
      category, 
      startDate, 
      endDate,
      page = 1, 
      limit = 50 
    } = req.query;

    const filter = {};

    if (status) filter.paymentStatus = status;
    if (agentId) filter.agentId = new mongoose.Types.ObjectId(agentId);
    if (category) filter.category = category;
    
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const [payments, total, summary] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      Payment.countDocuments(filter),
      Payment.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$paymentStatus',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const stats = { pending: 0, paid: 0, pendingCount: 0, paidCount: 0 };
    summary.forEach((s) => {
      if (s._id === 'pending') {
        stats.pending = s.total;
        stats.pendingCount = s.count;
      } else if (s._id === 'paid') {
        stats.paid = s.total;
        stats.paidCount = s.count;
      }
    });

    res.status(200).json({
      success: true,
      payments,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message,
    });
  }
};

// @desc    Get payment summary by agent
// @route   GET /api/admin/payments/by-agent
// @access  Private (Admin)
export const getPaymentsByAgent = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;

    const match = {};
    if (status) match.paymentStatus = status;
    if (startDate && endDate) {
      match.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const result = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$agentId',
          agentName: { $first: '$agentName' },
          totalAmount: { $sum: '$amount' },
          vendorCount: { $sum: 1 },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$amount', 0] },
          },
          paidAmount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$amount', 0] },
          },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    res.status(200).json({
      success: true,
      agents: result,
    });
  } catch (error) {
    console.error('Get payments by agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments by agent',
      error: error.message,
    });
  }
};

// @desc    Mark payment(s) as paid
// @route   PATCH /api/admin/payments/mark-paid
// @access  Private (Admin)
export const markPaymentsAsPaid = async (req, res) => {
  try {
    const { paymentIds, agentId } = req.body;

    let filter = {};
    if (paymentIds && paymentIds.length > 0) {
      filter._id = { $in: paymentIds.map(id => new mongoose.Types.ObjectId(id)) };
    } else if (agentId) {
      filter = { agentId: new mongoose.Types.ObjectId(agentId), paymentStatus: 'pending' };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Provide paymentIds or agentId',
      });
    }

    const result = await Payment.updateMany(
      filter,
      {
        $set: {
          paymentStatus: 'paid',
          paidDate: new Date(),
          paidBy: 'admin',
        },
      }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} payment(s) marked as paid`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Mark payments as paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark payments as paid',
      error: error.message,
    });
  }
};

// ==========================================
// AGENT PAYMENT APIs
// ==========================================

// @desc    Get agent's earnings summary
// @route   GET /api/agent/earnings
// @access  Private (Agent)
export const getAgentEarnings = async (req, res) => {
  try {
    const agentId = req.user.userId;

    // Get date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    // Run all queries in parallel for speed
    const [todayEarnings, monthEarnings, totalEarnings] = await Promise.all([
      Payment.aggregate([
        {
          $match: {
            agentId: new mongoose.Types.ObjectId(agentId),
            createdAt: { $gte: today, $lt: tomorrow },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Payment.aggregate([
        {
          $match: {
            agentId: new mongoose.Types.ObjectId(agentId),
            createdAt: { $gte: monthStart, $lte: monthEnd },
          },
        },
        {
          $group: {
            _id: '$paymentStatus',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Payment.aggregate([
        {
          $match: {
            agentId: new mongoose.Types.ObjectId(agentId),
          },
        },
        {
          $group: {
            _id: '$paymentStatus',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Process results
    const earnings = {
      today: todayEarnings[0]?.total || 0,
      todayCount: todayEarnings[0]?.count || 0,
      thisMonth: { pending: 0, paid: 0, total: 0 },
      allTime: { pending: 0, paid: 0, total: 0 },
    };

    monthEarnings.forEach((e) => {
      if (e._id === 'pending') earnings.thisMonth.pending = e.total;
      else if (e._id === 'paid') earnings.thisMonth.paid = e.total;
    });
    earnings.thisMonth.total = earnings.thisMonth.pending + earnings.thisMonth.paid;

    totalEarnings.forEach((e) => {
      if (e._id === 'pending') earnings.allTime.pending = e.total;
      else if (e._id === 'paid') earnings.allTime.paid = e.total;
    });
    earnings.allTime.total = earnings.allTime.pending + earnings.allTime.paid;

    res.status(200).json({
      success: true,
      earnings,
    });
  } catch (error) {
    console.error('Get agent earnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch earnings',
      error: error.message,
    });
  }
};

// @desc    Get agent's payment history
// @route   GET /api/agent/payments
// @access  Private (Agent)
export const getAgentPayments = async (req, res) => {
  try {
    const agentId = req.user.userId;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { agentId: new mongoose.Types.ObjectId(agentId) };
    if (status) filter.paymentStatus = status;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .select('vendorName category paymentType amount paymentStatus createdAt paidDate')
        .lean(),
      Payment.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get agent payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message,
    });
  }
};

// ==========================================
// FOLLOW-UP MANAGEMENT APIs (Agent)
// ==========================================

// @desc    Get agent's follow-ups
// @route   GET /api/agent/followups
// @access  Private (Agent)
export const getAgentFollowUps = async (req, res) => {
  try {
    const agentId = req.user.userId;
    const { status } = req.query; // 'upcoming', 'due', 'completed'

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filter = {
      createdById: new mongoose.Types.ObjectId(agentId),
    };

    // Include all follow-up related statuses (pending and completed)
    filter.visitStatus = { 
      $in: [
        'visited-followup-scheduled', 
        'followup-2nd-scheduled',
        'followup-onboarded',
        '2nd-followup-onboarded',
        'followup-rejected',
        '2nd-followup-rejected'
      ] 
    };

    if (status === 'upcoming') {
      filter.followUpDate = { $gt: today };
      filter.visitStatus = { $in: ['visited-followup-scheduled', 'followup-2nd-scheduled'] };
    } else if (status === 'due') {
      filter.followUpDate = { $lte: today };
      filter.visitStatus = { $in: ['visited-followup-scheduled', 'followup-2nd-scheduled'] };
    }

    const followups = await Vendor.find(filter)
      .select('restaurantName ownerName mobileNumber fullAddress paymentCategory visitStatus followUpDate secondFollowUpDate createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      followups,
      count: followups.length,
    });
  } catch (error) {
    console.error('Get agent follow-ups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch follow-ups',
      error: error.message,
    });
  }
};

// @desc    Update follow-up status (Agent reports outcome)
// @route   PATCH /api/agent/followups/:vendorId
// @access  Private (Agent)
export const updateFollowUpStatus = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const agentId = req.user.userId;
    // Accept both formats: { outcome, remarks } or { status, notes }
    let { outcome, remarks, nextFollowUpDate, status, notes } = req.body;
    
    // Convert from frontend format if needed
    if (!outcome && status) {
      // Convert status to outcome: 'followup-onboarded' -> 'onboarded', 'followup-rejected' -> 'rejected'
      if (status.includes('onboarded')) {
        outcome = 'onboarded';
      } else if (status.includes('rejected')) {
        outcome = 'rejected';
      } else if (status === 'followup-2nd-scheduled') {
        outcome = '2nd-followup';
      }
    }
    if (!remarks && notes) {
      remarks = notes;
    }

    const vendor = await Vendor.findOne({
      _id: vendorId,
      createdById: agentId,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found or not authorized',
      });
    }

    // Validate outcome
    if (!outcome) {
      return res.status(400).json({
        success: false,
        message: 'Outcome is required',
      });
    }

    // Store previous status and paid amount for payment calculation
    const previousStatus = vendor.visitStatus;
    const previousPaid = vendor.totalPaymentPaid || 0;

    // Update agent follow-up info
    vendor.agentFollowUpUpdate = {
      visitedOn: new Date(),
      outcome,
      remarks,
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
      updatedAt: new Date(),
    };

    // Add to follow-up history
    vendor.followUpHistory.push({
      date: new Date(),
      outcome,
      remarks,
      updatedBy: agentId,
    });

    // Determine new status based on outcome
    let newVisitStatus = previousStatus;
    if (outcome === 'onboarded') {
      newVisitStatus = previousStatus === 'visited-followup-scheduled' 
        ? 'followup-onboarded' 
        : '2nd-followup-onboarded';
    } else if (outcome === 'rejected') {
      newVisitStatus = previousStatus === 'visited-followup-scheduled'
        ? 'followup-rejected'
        : '2nd-followup-rejected';
    } else if (outcome === '2nd-followup' && nextFollowUpDate) {
      newVisitStatus = 'followup-2nd-scheduled';
      vendor.secondFollowUpDate = new Date(nextFollowUpDate);
    }

    vendor.visitStatus = newVisitStatus;

    // Create payment record if status changed and category is set
    let newPayment = null;
    if (vendor.paymentCategory && newVisitStatus !== previousStatus) {
      // Get payment config
      const config = await PaymentConfig.getConfig();
      
      const calculation = calculatePaymentAmount(
        vendor.paymentCategory,
        newVisitStatus,
        previousPaid,
        config
      );

      if (calculation.amount > 0) {
        // Create payment record
        newPayment = await Payment.create({
          agentId: vendor.createdById,
          agentName: vendor.createdByName || 'Unknown',
          vendorId: vendor._id,
          vendorName: vendor.restaurantName,
          category: vendor.paymentCategory,
          paymentType: calculation.paymentType,
          amount: calculation.amount,
          visitStatus: newVisitStatus,
          paymentStatus: 'pending',
          remarks: remarks || '',
        });

        // Update vendor payment tracking
        vendor.totalPaymentDue = (vendor.totalPaymentDue || 0) + calculation.amount;
      }
    }

    await vendor.save();

    // Create notification for admin about status update
    const user = await User.findById(agentId);
    if (user) {
      // Always create notification for any status change
      await createStatusUpdateNotification(
        vendor._id,
        agentId,
        user.name || user.userName,
        user.role,
        newVisitStatus,
        nextFollowUpDate || null
      );
    }

    res.status(200).json({
      success: true,
      message: 'Follow-up status updated',
      vendor: {
        _id: vendor._id,
        restaurantName: vendor.restaurantName,
        visitStatus: vendor.visitStatus,
        agentFollowUpUpdate: vendor.agentFollowUpUpdate,
      },
      paymentCreated: !!newPayment,
      paymentAmount: newPayment?.amount || 0,
      paymentType: newPayment?.paymentType || null,
    });
  } catch (error) {
    console.error('Update follow-up status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update follow-up status',
      error: error.message,
    });
  }
};

// ==========================================
// ADMIN - GET SINGLE AGENT PAYMENT DETAILS
// ==========================================

// @desc    Get detailed payment info for a specific agent (for admin)
// @route   GET /api/payments/admin/payments/agent/:agentId
// @access  Private (Admin)
export const getAgentPaymentDetails = async (req, res) => {
  try {
    const { agentId } = req.params;

    // Find agent info (try User first, then Agent)
    const User = (await import('../models/User.js')).default;
    const Agent = (await import('../models/Agent.js')).default;
    
    let agentInfo = await User.findById(agentId).select('name email phone profileImage isActive agentType');
    if (!agentInfo) {
      agentInfo = await Agent.findById(agentId).select('name email phone profileImage isActive agentType');
    }
    
    if (!agentInfo) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    // Get all payments for this agent
    const payments = await Payment.find({ agentId })
      .sort({ createdAt: -1 });

    // Calculate stats
    const stats = {
      total: 0,
      pending: 0,
      paid: 0,
      paymentCounts: {
        visit: 0,
        followup: 0,
        onboarding: 0,
        balance: 0,
      },
      vendorCounts: {
        visited: 0,
        onboarded: 0,
        rejected: 0,
        followup: 0,
      },
    };

    const vendorSet = new Set();

    payments.forEach(p => {
      stats.total += p.amount;
      if (p.paymentStatus === 'pending') {
        stats.pending += p.amount;
      } else {
        stats.paid += p.amount;
      }

      // Track payment types
      if (p.paymentType === 'visit') stats.paymentCounts.visit++;
      else if (p.paymentType === 'followup') stats.paymentCounts.followup++;
      else if (p.paymentType === 'onboarding') stats.paymentCounts.onboarding++;
      else if (p.paymentType === 'balance') stats.paymentCounts.balance++;

      // Track unique vendors
      vendorSet.add(p.vendorId.toString());

      // Track vendor outcomes
      if (p.visitStatus && p.visitStatus.includes('onboarded')) {
        stats.vendorCounts.onboarded++;
      } else if (p.visitStatus && p.visitStatus.includes('rejected')) {
        stats.vendorCounts.rejected++;
      } else if (p.visitStatus && p.visitStatus.includes('followup')) {
        stats.vendorCounts.followup++;
      } else {
        stats.vendorCounts.visited++;
      }
    });

    stats.totalVendors = vendorSet.size;

    // Get payment config for reference
    const config = await PaymentConfig.getConfig();

    res.status(200).json({
      success: true,
      agent: {
        _id: agentInfo._id,
        name: agentInfo.name,
        email: agentInfo.email,
        phone: agentInfo.phone,
        profileImage: agentInfo.profileImage,
        isActive: agentInfo.isActive,
        agentType: agentInfo.agentType,
      },
      payments,
      stats,
      paymentConfig: config,
    });
  } catch (error) {
    console.error('Get agent payment details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent payment details',
      error: error.message,
    });
  }
};

// @desc    Update payment record
// @route   PUT /api/payments/admin/payments/:paymentId
// @access  Private (Admin)
export const updatePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { category, paymentType, amount, paymentStatus } = req.body;

    // Find payment
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    // Update fields if provided
    if (category) payment.category = category;
    if (paymentType) payment.paymentType = paymentType;
    if (amount !== undefined) payment.amount = amount;
    if (paymentStatus) {
      payment.paymentStatus = paymentStatus;
      if (paymentStatus === 'paid' && !payment.paidDate) {
        payment.paidDate = new Date();
        payment.paidBy = 'admin';
      } else if (paymentStatus === 'pending') {
        payment.paidDate = null;
        payment.paidBy = null;
      }
    }

    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment record updated successfully',
      payment,
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment record',
      error: error.message,
    });
  }
};

// @desc    Delete payment record
// @route   DELETE /api/payments/admin/payments/:paymentId
// @access  Private (Admin)
export const deletePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Find and delete payment (vendor request stays)
    const payment = await Payment.findByIdAndDelete(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment record deleted successfully',
    });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment record',
      error: error.message,
    });
  }
};
