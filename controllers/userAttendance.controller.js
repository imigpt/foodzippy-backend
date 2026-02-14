import UserAttendance from '../models/UserAttendance.js';
import User from '../models/User.js';

// @desc    User Check-in (Agent/Employee)
// @route   POST /api/agent/attendance/check-in OR POST /api/employee/attendance/check-in
// @access  Private (User)
export const checkIn = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { location } = req.body;

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await UserAttendance.findOne({
      userId,
      date: today,
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked in today',
        attendance: existingAttendance,
      });
    }

    // Create new attendance record
    const attendance = await UserAttendance.create({
      userId,
      userName: user.name,
      role: user.role,
      date: today,
      checkIn: new Date(),
      location: {
        checkInLocation: location || {},
      },
    });

    res.status(201).json({
      success: true,
      message: 'Checked in successfully',
      attendance,
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check in',
    });
  }
};

// @desc    User Check-out (Agent/Employee)
// @route   POST /api/agent/attendance/check-out OR POST /api/employee/attendance/check-out
// @access  Private (User)
export const checkOut = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { location, remark } = req.body;

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance
    const attendance = await UserAttendance.findOne({
      userId,
      date: today,
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'You have not checked in today',
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked out today',
        attendance,
      });
    }

    // Update check-out
    attendance.checkOut = new Date();
    if (location) {
      attendance.location.checkOutLocation = location;
    }
    if (remark) {
      attendance.remark = remark;
    }

    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Checked out successfully',
      attendance,
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check out',
    });
  }
};

// @desc    Get user's own attendance records
// @route   GET /api/agent/attendance/my OR GET /api/employee/attendance/my
// @access  Private (User)
export const getMyAttendance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, year, startDate, endDate } = req.query;

    let query = { userId };

    // Filter by month and year
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    }
    // Filter by date range
    else if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    // Default: current month
    else {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    }

    const attendance = await UserAttendance.find(query).sort({ date: -1 });

    // Calculate statistics
    const totalDays = attendance.length;
    const presentDays = attendance.filter((a) => a.status === 'Present').length;
    const halfDays = attendance.filter((a) => a.status === 'Half-Day').length;
    const totalMinutes = attendance.reduce((sum, a) => sum + a.duration, 0);
    const avgDuration = totalDays > 0 ? Math.floor(totalMinutes / totalDays) : 0;

    res.status(200).json({
      success: true,
      count: attendance.length,
      statistics: {
        totalDays,
        presentDays,
        halfDays,
        avgDuration,
        totalHours: Math.floor(totalMinutes / 60),
      },
      attendance,
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch attendance',
    });
  }
};

// @desc    Get today's attendance status
// @route   GET /api/agent/attendance/today OR GET /api/employee/attendance/today
// @access  Private (User)
export const getTodayAttendance = async (req, res) => {
  try {
    const userId = req.user.userId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await UserAttendance.findOne({
      userId,
      date: today,
    });

    res.status(200).json({
      success: true,
      attendance: attendance || null,
      hasCheckedIn: !!attendance,
      hasCheckedOut: attendance ? !!attendance.checkOut : false,
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch today attendance',
    });
  }
};

// @desc    Get all users' attendance (Admin only)
// @route   GET /api/admin/attendance
// @access  Private (Admin)
export const getAllAttendance = async (req, res) => {
  try {
    const { userId, role, month, year, startDate, endDate, status } = req.query;

    let query = {};

    // Filter by user
    if (userId) {
      query.userId = userId;
    }

    // Filter by role (agent or employee)
    if (role && ['agent', 'employee'].includes(role)) {
      query.role = role;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by month and year
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    }
    // Filter by date range
    else if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendance = await UserAttendance.find(query)
      .populate('userId', 'name username email role')
      .sort({ date: -1, checkIn: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch attendance',
    });
  }
};

// @desc    Get specific user's attendance (Admin only)
// @route   GET /api/admin/attendance/:userId
// @access  Private (Admin)
export const getUserAttendance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year, startDate, endDate } = req.query;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    let query = { userId };

    // Filter by month and year
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    }
    // Filter by date range
    else if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendance = await UserAttendance.find(query).sort({ date: -1 });

    // Calculate statistics
    const totalDays = attendance.length;
    const presentDays = attendance.filter((a) => a.status === 'Present').length;
    const halfDays = attendance.filter((a) => a.status === 'Half-Day').length;
    const totalMinutes = attendance.reduce((sum, a) => sum + a.duration, 0);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      statistics: {
        totalDays,
        presentDays,
        halfDays,
        totalHours: Math.floor(totalMinutes / 60),
      },
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    console.error('Get user attendance error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user attendance',
    });
  }
};
