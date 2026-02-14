import express from 'express';
import { registerVendor, getUnreadVendorRequestsCount, markVendorRequestsAsSeen } from '../controllers/vendor.controller.js';
import upload from '../middleware/upload.js';
import combinedAuth from '../middleware/combinedAuth.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

router.post('/register', upload.single('restaurantImage'), combinedAuth, registerVendor);
router.get('/unread-count', adminAuth, getUnreadVendorRequestsCount);
router.patch('/mark-seen', adminAuth, markVendorRequestsAsSeen);

export default router;
