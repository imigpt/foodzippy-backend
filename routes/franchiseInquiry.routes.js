import express from 'express';
import {
  createFranchiseInquiry,
  getAllFranchiseInquiries,
  getFranchiseInquiry,
  updateFranchiseInquiry,
  deleteFranchiseInquiry,
  getFranchiseInquiryStats,
} from '../controllers/franchiseInquiry.controller.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// Public route - anyone can submit an inquiry
router.post('/', createFranchiseInquiry);

// Admin routes - require authentication
router.get('/stats', adminAuth, getFranchiseInquiryStats);
router.get('/', adminAuth, getAllFranchiseInquiries);
router.get('/:id', adminAuth, getFranchiseInquiry);
router.patch('/:id', adminAuth, updateFranchiseInquiry);
router.delete('/:id', adminAuth, deleteFranchiseInquiry);

export default router;
