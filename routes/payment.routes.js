import express from 'express';
import {
  getPaymentConfig,
  updatePaymentConfig,
  updateVendorPaymentStatus,
  getAllPayments,
  getPaymentsByAgent,
  getAgentPaymentDetails,
  markPaymentsAsPaid,
  updatePayment,
  deletePayment,
  getAgentEarnings,
  getAgentPayments,
  getAgentFollowUps,
  updateFollowUpStatus,
} from '../controllers/payment.controller.js';
import adminAuth from '../middleware/adminAuth.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

// ==========================================
// ADMIN ROUTES
// ==========================================

// Payment Config
router.get('/admin/payment-config', adminAuth, getPaymentConfig);
router.put('/admin/payment-config', adminAuth, updatePaymentConfig);

// Vendor Payment Status
router.patch('/admin/vendors/:id/payment-status', adminAuth, updateVendorPaymentStatus);

// Payment Management
router.get('/admin/payments', adminAuth, getAllPayments);
router.get('/admin/payments/by-agent', adminAuth, getPaymentsByAgent);
router.get('/admin/payments/agent/:agentId', adminAuth, getAgentPaymentDetails);
router.patch('/admin/payments/mark-paid', adminAuth, markPaymentsAsPaid);
router.put('/admin/payments/:paymentId', adminAuth, updatePayment);
router.delete('/admin/payments/:paymentId', adminAuth, deletePayment);

// ==========================================
// AGENT/EMPLOYEE ROUTES
// ==========================================

// Earnings & Payments
router.get('/agent/earnings', userAuth, getAgentEarnings);
router.get('/agent/payments', userAuth, getAgentPayments);

// Follow-ups
router.get('/agent/followups', userAuth, getAgentFollowUps);
router.patch('/agent/followups/:vendorId', userAuth, updateFollowUpStatus);

export default router;
