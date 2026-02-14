import express from 'express';
import {
  checkIn,
  checkOut,
  getMyAttendance,
  getTodayAttendance,
  getAllAttendance,
  getUserAttendance,
} from '../controllers/userAttendance.controller.js';
import userAuth from '../middleware/userAuth.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// Agent attendance routes
router.post('/agent/check-in', userAuth, checkIn);
router.post('/agent/check-out', userAuth, checkOut);
router.get('/agent/my', userAuth, getMyAttendance);
router.get('/agent/today', userAuth, getTodayAttendance);

// Employee attendance routes (same functionality)
router.post('/employee/check-in', userAuth, checkIn);
router.post('/employee/check-out', userAuth, checkOut);
router.get('/employee/my', userAuth, getMyAttendance);
router.get('/employee/today', userAuth, getTodayAttendance);

// Admin routes - view all attendance (filter by role)
router.get('/admin/all', adminAuth, getAllAttendance);
router.get('/admin/:userId', adminAuth, getUserAttendance);

export default router;
