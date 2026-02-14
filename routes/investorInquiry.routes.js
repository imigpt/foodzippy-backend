import express from 'express';
import {
  createInvestorInquiry,
  getAllInvestorInquiries,
  getInvestorInquiry,
  updateInvestorInquiry,
  deleteInvestorInquiry,
  getInvestorInquiryStats,
} from '../controllers/investorInquiry.controller.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// Public route - anyone can submit an inquiry
router.post('/', createInvestorInquiry);

// Admin routes - require authentication
router.get('/stats', adminAuth, getInvestorInquiryStats);
router.get('/', adminAuth, getAllInvestorInquiries);
router.get('/:id', adminAuth, getInvestorInquiry);
router.patch('/:id', adminAuth, updateInvestorInquiry);
router.delete('/:id', adminAuth, deleteInvestorInquiry);

export default router;
