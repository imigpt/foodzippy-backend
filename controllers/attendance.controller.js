import AgentAttendance from '../models/AgentAttendance.js';
import UserAttendance from '../models/UserAttendance.js';
import Agent from '../models/Agent.js';
import User from '../models/User.js';

// @desc    Agent/Employee Check-in
// @route   POST /api/agent/attendance/check-in
// @access  Private (Agent/Employee)
export const checkIn = async (req, res) => {
  try {
    // Support both old Agent and new User systems
    const userId = req.user?.userId || req.agent?.agentId;
    const isNewSystem = !!req.user;
    const { location } = req.body;

    // Get user/agent details
    let userName;
    if (isNewSystem) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
      userName = user.name;
    } else {
      const agent = await Agent.findById(userId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found',
        });
      }
      userName = agent.name;
    }

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today (use appropriate model)
    const AttendanceModel = isNewSystem ? UserAttendance : AgentAttendance;
    const userIdField = isNewSystem ? 'userId' : 'agentId';
    
    const existingAttendance = await AttendanceModel.findOne({
      [userIdField]: userId,
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
    const attendanceData = {
      [userIdField]: userId,
      [isNewSystem ? 'userName' : 'agentName']: userName,
      date: today,
      checkIn: new Date(),
      location: {
        checkInLocation: location || {},
      },
    };

    const attendance = await AttendanceModel.create(attendanceData);

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

// @desc    Agent/Employee Check-out
// @route   POST /api/agent/attendance/check-out
// @access  Private (Agent/Employee)
export const checkOut = async (req, res) => {
  try {
    // Support both old Agent and new User systems
    const userId = req.user?.userId || req.agent?.agentId;
    const isNewSystem = !!req.user;
    const { location, remark } = req.body;

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance (use appropriate model)
    const AttendanceModel = isNewSystem ? UserAttendance : AgentAttendance;
    const userIdField = isNewSystem ? 'userId' : 'agentId';
    
    const attendance = await AttendanceModel.findOne({
      [userIdField]: userId,
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

// @desc    Get agent/employee's own attendance records
// @route   GET /api/agent/attendance/my
// @access  Private (Agent/Employee)
export const getMyAttendance = async (req, res) => {
  try {
    // Support both old Agent and new User systems
    const userId = req.user?.userId || req.agent?.agentId;
    const isNewSystem = !!req.user;
    const { month, year, startDate, endDate } = req.query;

    const AttendanceModel = isNewSystem ? UserAttendance : AgentAttendance;
    const userIdField = isNewSystem ? 'userId' : 'agentId';
    
    let query = { [userIdField]: userId };

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

    const attendance = await AgentAttendance.find(query).sort({ date: -1 });

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
// @route   GET /api/agent/attendance/today
// @access  Private (Agent/Employee)
export const getTodayAttendance = async (req, res) => {
  try {
    // Support both old Agent and new User systems
    const userId = req.user?.userId || req.agent?.agentId;
    const isNewSystem = !!req.user;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const AttendanceModel = isNewSystem ? UserAttendance : AgentAttendance;
    const userIdField = isNewSystem ? 'userId' : 'agentId';

    const attendance = await AttendanceModel.findOne({
      [userIdField]: userId,
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

// @desc    Get all agents' attendance (Admin only)
// @route   GET /api/admin/attendance
// @access  Private (Admin)
export const getAllAttendance = async (req, res) => {
  try {
    const { agentId, month, year, startDate, endDate, status } = req.query;

    let query = {};

    // Filter by agent
    if (agentId) {
      query.agentId = agentId;
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

    const attendance = await AgentAttendance.find(query)
      .populate('agentId', 'name username email agentType')
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

// @desc    Get specific agent's attendance (Admin only)
// @route   GET /api/admin/attendance/:agentId
// @access  Private (Admin)
export const getAgentAttendance = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { month, year, startDate, endDate } = req.query;

    // Verify agent exists
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    let query = { agentId };

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

    const attendance = await AgentAttendance.find(query).sort({ date: -1 });

    // Calculate statistics
    const totalDays = attendance.length;
    const presentDays = attendance.filter((a) => a.status === 'Present').length;
    const halfDays = attendance.filter((a) => a.status === 'Half-Day').length;
    const totalMinutes = attendance.reduce((sum, a) => sum + a.duration, 0);

    res.status(200).json({
      success: true,
      agent: {
        id: agent._id,
        name: agent.name,
        username: agent.username,
        email: agent.email,
        agentType: agent.agentType,
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
    console.error('Get agent attendance error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch agent attendance',
    });
  }
};
