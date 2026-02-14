import express from 'express';
import {
  checkIn,
  checkOut,
  getMyAttendance,
  getTodayAttendance,
} from '../controllers/attendance.controller.js';
import combinedAuth from '../middleware/combinedAuth.js';

const router = express.Router();

// All routes are protected with combinedAuth middleware (supports both old Agent and new User tokens)
router.use(combinedAuth);

// Agent/Employee attendance routes
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/my', getMyAttendance);
router.get('/today', getTodayAttendance);

export default router;
