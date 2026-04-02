import express from 'express';
import { registerVendor, getPublicVendors, getPublicVendorById, getUnreadVendorRequestsCount, markVendorRequestsAsSeen } from '../controllers/vendor.controller.js';
import upload from '../middleware/upload.js';
import combinedAuth from '../middleware/combinedAuth.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// Specific named routes MUST come before /:id
router.post('/register', upload.single('restaurantImage'), combinedAuth, registerVendor);
router.get('/unread-count', adminAuth, getUnreadVendorRequestsCount);
router.patch('/mark-seen', adminAuth, markVendorRequestsAsSeen);

// Public routes (no auth) — must come after named routes
router.get('/', getPublicVendors);
router.get('/:id', getPublicVendorById);

export default router;
