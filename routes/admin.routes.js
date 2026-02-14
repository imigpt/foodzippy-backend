import express from 'express';
import {
  adminLogin,
  getAllVendors,
  getVendorById,
  updateVendor,
  getVendorAnalytics,
  getAllAgentAttendance,
  getAgentAttendanceByAdmin,
  approveVendorEdit,
  rejectVendorEdit,
  getPendingEditRequests,
  getUnreadEditRequestsCount,
  markEditRequestsAsSeen,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserAttendance,
  getAllUserAttendance,
  getVendorsByListingType,
  updateVendorListingCharge,
} from '../controllers/admin.controller.js';
import { getUnreadVendorRequestsCount, markVendorRequestsAsSeen } from '../controllers/vendor.controller.js';
import adminAuth from '../middleware/adminAuth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.post('/login', adminLogin);

// Vendor routes
router.get('/vendors', adminAuth, getAllVendors);
router.get('/vendors/analytics', adminAuth, getVendorAnalytics);
router.get('/vendors/unread-count', adminAuth, getUnreadVendorRequestsCount);
router.patch('/vendors/mark-seen', adminAuth, markVendorRequestsAsSeen);

// Vendor Listing Charge routes (MUST come before :id routes)
router.get('/vendors/listing/:type', adminAuth, getVendorsByListingType);
router.put('/vendors/:id/listing-charge', adminAuth, updateVendorListingCharge);

// Generic vendor routes (MUST come after specific routes)
router.get('/vendors/:id', adminAuth, getVendorById);
router.patch('/vendors/:id', adminAuth, updateVendor);

// Edit request routes
router.get('/edit-requests/pending', adminAuth, getPendingEditRequests);
router.get('/edit-requests/unread-count', adminAuth, getUnreadEditRequestsCount);
router.patch('/edit-requests/mark-seen', adminAuth, markEditRequestsAsSeen);
router.patch('/edit-requests/:id/approve', adminAuth, approveVendorEdit);
router.patch('/edit-requests/:id/reject', adminAuth, rejectVendorEdit);

// Attendance routes
router.get('/attendance', adminAuth, getAllAgentAttendance);
router.get('/attendance/:agentId', adminAuth, getAgentAttendanceByAdmin);

// User Management routes (Agents & Employees)
router.get('/users', adminAuth, getAllUsers);
router.get('/users/:id', adminAuth, getUserById);
router.post('/users', adminAuth, createUser);
router.put('/users/:id', adminAuth, upload.single('profileImage'), updateUser);
router.delete('/users/:id', adminAuth, deleteUser);

// User Attendance routes
router.get('/users-attendance', adminAuth, getAllUserAttendance);
router.get('/users-attendance/:userId', adminAuth, getUserAttendance);

export default router;
