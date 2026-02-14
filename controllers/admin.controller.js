import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Vendor from '../models/Vendor.js';
import AgentAttendance from '../models/AgentAttendance.js';
import Agent from '../models/Agent.js';
import User from '../models/User.js';
import UserAttendance from '../models/UserAttendance.js';
import { createFollowUpNotification } from './notification.controller.js';

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (email !== adminEmail || password !== adminPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = jwt.sign(
      { email: adminEmail, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        email: adminEmail,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
};

export const getAllVendors = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      city, 
      search, 
      agentId,
      dateFilter, // daily, weekly, monthly
      followUpFilter, // daily, weekly, monthly
      includeStats = false // whether to include statistics
    } = req.query;

    const filter = {};

    // Agent/Employee filter
    if (agentId) {
      // Support both old system (agentId) and new system (createdById)
      filter.$or = [
        { agentId: agentId },
        { createdById: agentId }
      ];
    }

    // Status filter
    if (status && status !== 'all') {
      filter.restaurantStatus = status;
    }

    // City filter
    if (city) {
      filter.city = city;
    }

    // Date filter (for creation date)
    if (dateFilter) {
      const now = new Date();
      let startDate;

      switch (dateFilter) {
        case 'daily':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'weekly':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'monthly':
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
      }

      if (startDate) {
        filter.createdAt = { $gte: startDate };
      }
    }

    // Follow-up date filter
    if (followUpFilter) {
      const now = new Date();
      let startDate, endDate;

      switch (followUpFilter) {
        case 'daily':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'weekly':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setDate(now.getDate() + 7));
          break;
        case 'monthly':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setDate(now.getDate() + 30));
          break;
      }

      if (startDate && endDate) {
        filter['review.followUpDate'] = { 
          $gte: startDate,
          $lte: endDate 
        };
      }
    }

    // Search filter
    if (search) {
      // First, try to find users (agents/employees) matching the search
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } }
        ]
      }).select('_id').lean();
      
      const userIds = matchingUsers.map(u => u._id);

      // Also check legacy Agent model
      const matchingAgents = await Agent.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } }
        ]
      }).select('_id').lean();
      
      const agentIds = matchingAgents.map(a => a._id);

      filter.$or = [
        { restaurantName: { $regex: search, $options: 'i' } },
        { loginEmail: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        ...(userIds.length > 0 ? [{ createdById: { $in: userIds } }] : []),
        ...(agentIds.length > 0 ? [{ agentId: { $in: agentIds } }] : [])
      ];
    }

    const skip = (page - 1) * limit;

    const vendors = await Vendor.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Vendor.countDocuments(filter);

    // Calculate statistics if requested
    let statistics = {};
    if (includeStats === 'true' && agentId) {
      const agentFilter = {
        $or: [
          { agentId: agentId },
          { createdById: agentId }
        ]
      };

      // Count by status
      const [approved, pending, rejected, totalWithFollowUp] = await Promise.all([
        Vendor.countDocuments({ ...agentFilter, restaurantStatus: 'publish' }),
        Vendor.countDocuments({ ...agentFilter, restaurantStatus: 'pending' }),
        Vendor.countDocuments({ ...agentFilter, restaurantStatus: 'reject' }),
        Vendor.countDocuments({ 
          ...agentFilter, 
          'review.followUpDate': { $exists: true, $ne: null } 
        })
      ]);

      // Count follow-ups by time period
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const todayEnd = new Date(now.setHours(23, 59, 59, 999));
      const weekEnd = new Date(now.setDate(now.getDate() + 7));
      const monthEnd = new Date(now.setDate(now.getDate() + 30));

      const [followUpToday, followUpWeek, followUpMonth] = await Promise.all([
        Vendor.countDocuments({
          ...agentFilter,
          'review.followUpDate': { $gte: todayStart, $lte: todayEnd }
        }),
        Vendor.countDocuments({
          ...agentFilter,
          'review.followUpDate': { $gte: todayStart, $lte: weekEnd }
        }),
        Vendor.countDocuments({
          ...agentFilter,
          'review.followUpDate': { $gte: todayStart, $lte: monthEnd }
        })
      ]);

      statistics = {
        approved,
        pending,
        rejected,
        totalRequests: approved + pending + rejected,
        totalWithFollowUp,
        followUpToday,
        followUpWeek,
        followUpMonth
      };
    }

    res.status(200).json({
      success: true,
      data: vendors,
      statistics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get All Vendors Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors',
      error: error.message,
    });
  }
};

export const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findById(id).lean();

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    console.error('Get Vendor By ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor',
      error: error.message,
    });
  }
};

export const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get the vendor before update to check for follow-up date changes
    const oldVendor = await Vendor.findById(id);
    
    if (!oldVendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Check if follow-up date is being updated
    const oldFollowUpDate = oldVendor.review?.followUpDate;
    const newFollowUpDate = updateData.review?.followUpDate;

    const vendor = await Vendor.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Create notification if follow-up date changed and updated by agent/employee
    if (newFollowUpDate !== undefined && 
        newFollowUpDate !== oldFollowUpDate &&
        oldVendor.createdById && 
        oldVendor.createdByRole) {
      
      await createFollowUpNotification(
        vendor._id,
        oldVendor.createdById,
        oldVendor.createdByName || oldVendor.createdByUsername,
        oldVendor.createdByRole,
        oldFollowUpDate,
        newFollowUpDate
      );
    }

    res.status(200).json({
      success: true,
      message: 'Vendor updated successfully',
      data: vendor,
    });
  } catch (error) {
    console.error('Update Vendor Error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update vendor',
      error: error.message,
    });
  }
};

export const getVendorAnalytics = async (req, res) => {
  try {
    const analytics = await Vendor.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          count: 1,
        },
      },
    ]);

    const totalVendors = await Vendor.countDocuments();
    const pendingVendors = await Vendor.countDocuments({ restaurantStatus: 'pending' });
    const approvedVendors = await Vendor.countDocuments({ restaurantStatus: 'publish' });
    const rejectedVendors = await Vendor.countDocuments({ restaurantStatus: 'reject' });

    res.status(200).json({
      success: true,
      data: {
        monthlyRequests: analytics,
        summary: {
          total: totalVendors,
          pending: pendingVendors,
          approved: approvedVendors,
          rejected: rejectedVendors,
        },
      },
    });
  } catch (error) {
    console.error('Get Vendor Analytics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message,
    });
  }
};

// ========================================
// ADMIN ATTENDANCE MANAGEMENT
// ========================================

// @desc    Get all agents' attendance
// @route   GET /api/admin/attendance
// @access  Private (Admin)
export const getAllAgentAttendance = async (req, res) => {
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
    // Default: current month
    else {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    }

    const attendance = await AgentAttendance.find(query)
      .populate('agentId', 'name username email agentType profileImage')
      .sort({ date: -1, checkIn: -1 });

    // Calculate summary statistics
    const totalRecords = attendance.length;
    const uniqueAgents = [...new Set(attendance.map(a => a.agentId?._id.toString()))].length;
    const presentCount = attendance.filter(a => a.status === 'Present').length;
    const halfDayCount = attendance.filter(a => a.status === 'Half-Day').length;

    res.status(200).json({
      success: true,
      count: totalRecords,
      summary: {
        totalRecords,
        uniqueAgents,
        presentCount,
        halfDayCount,
      },
      attendance,
    });
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance',
      error: error.message,
    });
  }
};

// @desc    Get specific agent's attendance (Admin view)
// @route   GET /api/admin/attendance/agent/:agentId
// @access  Private (Admin)
export const getAgentAttendanceByAdmin = async (req, res) => {
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
    // Default: last 30 days
    else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      query.date = { $gte: start, $lte: end };
    }

    const attendance = await AgentAttendance.find(query).sort({ date: -1 });

    // Calculate statistics
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'Present').length;
    const halfDays = attendance.filter(a => a.status === 'Half-Day').length;
    const totalMinutes = attendance.reduce((sum, a) => sum + a.duration, 0);
    const avgDuration = totalDays > 0 ? Math.floor(totalMinutes / totalDays) : 0;

    res.status(200).json({
      success: true,
      agent: {
        id: agent._id,
        name: agent.name,
        username: agent.username,
        email: agent.email,
        agentType: agent.agentType,
        profileImage: agent.profileImage,
      },
      statistics: {
        totalDays,
        presentDays,
        halfDays,
        totalHours: Math.floor(totalMinutes / 60),
        avgHoursPerDay: Math.floor(avgDuration / 60),
      },
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    console.error('Get agent attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent attendance',
      error: error.message,
    });
  }
};

// @desc    Approve vendor edit request
// @route   PUT /api/admin/vendors/:id/approve-edit
// @access  Private (Admin)
export const approveVendorEdit = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    if (!vendor.editRequested) {
      return res.status(400).json({
        success: false,
        message: 'No edit request found for this vendor',
      });
    }

    vendor.editApproved = true;
    vendor.editApprovalDate = new Date();

    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Edit request approved successfully',
      vendor,
    });
  } catch (error) {
    console.error('Approve edit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve edit request',
      error: error.message,
    });
  }
};

// @desc    Reject vendor edit request
// @route   PUT /api/admin/vendors/:id/reject-edit
// @access  Private (Admin)
export const rejectVendorEdit = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    if (!vendor.editRequested) {
      return res.status(400).json({
        success: false,
        message: 'No edit request found for this vendor',
      });
    }

    vendor.editRequested = false;
    vendor.editApproved = false;
    vendor.editRequestDate = null;
    vendor.editRemark = '';

    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Edit request rejected successfully',
      vendor,
    });
  } catch (error) {
    console.error('Reject edit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject edit request',
      error: error.message,
    });
  }
};

// @desc    Get vendors with pending edit requests
// @route   GET /api/admin/vendors/edit-requests
// @access  Private (Admin)
export const getPendingEditRequests = async (req, res) => {
  try {
    const vendors = await Vendor.find({ editRequested: true, editApproved: false })
      .populate('createdById', 'name username email role')
      .sort({ editRequestDate: -1 });

    res.status(200).json({
      success: true,
      count: vendors.length,
      vendors,
    });
  } catch (error) {
    console.error('Get edit requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch edit requests',
      error: error.message,
    });
  }
};

// User Management APIs (Agents and Employees)
export const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query; // Optional filter by role
    
    const filter = role ? { role } : {};
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message,
    });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, username, password, mobileNumber, email, dob, role } = req.body;

    if (!name || !username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, username, password, and role are required',
      });
    }

    if (!['agent', 'employee'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "agent" or "employee"',
      });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists',
      });
    }

    // Don't hash here - let the User model's pre-save hook handle it
    const user = new User({
      name,
      username,
      password: password, // Plain password - will be hashed by pre-save hook
      phone: mobileNumber,
      email,
      dob,
      role,
      isActive: true,
    });

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully`,
      user: userResponse,
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, mobileNumber, phone, alternatePhone, email, dob, isActive, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists',
        });
      }
    }

    // Handle profile image upload if provided
    if (req.file) {
      const cloudinary = await import('../config/cloudinary.js').then(m => m.default);
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'foodzippy/users',
            resource_type: 'image',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      user.profileImage = uploadResult.secure_url;
    }

    if (name) user.name = name;
    if (username) user.username = username;
    if (mobileNumber) user.phone = mobileNumber; // Support mobileNumber field
    if (phone) user.phone = phone; // Support phone field
    if (alternatePhone !== undefined) user.alternatePhone = alternatePhone; // Support alternatePhone field
    if (email !== undefined) user.email = email;
    if (dob !== undefined) user.dob = dob;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (password) {
      user.password = password; // Plain password - will be hashed by pre-save hook
    }

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: userResponse,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} deleted successfully`,
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message,
    });
  }
};

export const getUserAttendance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year, status } = req.query;

    const filter = { userId };

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    if (status) {
      filter.status = status;
    }

    const attendance = await UserAttendance.find(filter)
      .sort({ date: -1 })
      .populate('userId', 'name username role');

    const totalMinutes = attendance.reduce((sum, a) => sum + (a.duration || 0), 0);
    const avgDuration = attendance.length > 0 ? Math.floor(totalMinutes / attendance.length) : 0;

    const statistics = {
      totalDays: attendance.length,
      presentDays: attendance.filter(a => a.status === 'Present').length,
      halfDays: attendance.filter(a => a.status === 'Half-Day' || a.status === 'Half Day').length,
      totalHours: Math.floor(totalMinutes / 60),
      avgHoursPerDay: Math.floor(avgDuration / 60),
    };

    res.status(200).json({
      success: true,
      attendance,
      statistics,
    });
  } catch (error) {
    console.error('Get user attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance',
      error: error.message,
    });
  }
};

export const getAllUserAttendance = async (req, res) => {
  try {
    const { role, month, year, status } = req.query;

    const filter = {};

    if (role) {
      filter.role = role;
    }

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    if (status) {
      filter.status = status;
    }

    const attendance = await UserAttendance.find(filter)
      .sort({ date: -1 })
      .populate('userId', 'name username role');

    const uniqueUsers = [...new Set(attendance.map(a => a.userId?._id?.toString()))];

    const statistics = {
      totalRecords: attendance.length,
      uniqueUsers: uniqueUsers.length,
      presentCount: attendance.filter(a => a.status === 'Present').length,
      halfDayCount: attendance.filter(a => a.status === 'Half Day').length,
      totalDuration: attendance.reduce((sum, a) => sum + (a.duration || 0), 0),
    };

    statistics.averageDuration = statistics.totalRecords > 0 
      ? statistics.totalDuration / statistics.totalRecords 
      : 0;

    res.status(200).json({
      success: true,
      attendance,
      statistics,
    });
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance',
      error: error.message,
    });
  }
};

// @desc    Get unread edit requests count
// @route   GET /api/admin/edit-requests/unread-count
// @access  Private (Admin)
export const getUnreadEditRequestsCount = async (req, res) => {
  try {
    const count = await Vendor.countDocuments({ 
      editRequested: true, 
      editApproved: false,
      editSeenByAdmin: false 
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Get unread edit requests count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message,
    });
  }
};

// @desc    Mark edit requests as seen by admin
// @route   PATCH /api/admin/edit-requests/mark-seen
// @access  Private (Admin)
export const markEditRequestsAsSeen = async (req, res) => {
  try {
    const result = await Vendor.updateMany(
      { 
        editRequested: true, 
        editApproved: false,
        editSeenByAdmin: false 
      },
      { editSeenByAdmin: true }
    );

    res.status(200).json({
      success: true,
      message: 'Edit requests marked as seen',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Mark edit requests as seen error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as seen',
      error: error.message,
    });
  }
};

// ==========================================
// VENDOR LISTING CHARGE MANAGEMENT
// ==========================================

export const getVendorsByListingType = async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Validate listing type
    if (!['launching', 'vip', 'normal'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid listing type. Must be: launching, vip, or normal',
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [vendors, total] = await Promise.all([
      Vendor.find({ listingType: type })
        .populate('createdById', 'name username email phone')
        .select('restaurantName restaurantImage fullAddress city state listingType listingCharge restaurantStatus createdAt createdByName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Vendor.countDocuments({ listingType: type }),
    ]);

    res.status(200).json({
      success: true,
      vendors,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
      listingType: type,
    });
  } catch (error) {
    console.error('Get vendors by listing type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors',
      error: error.message,
    });
  }
};

export const updateVendorListingCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const { listingCharge } = req.body;

    // Validate charge
    if (listingCharge === undefined || listingCharge === null) {
      return res.status(400).json({
        success: false,
        message: 'Listing charge is required',
      });
    }

    if (listingCharge < 0) {
      return res.status(400).json({
        success: false,
        message: 'Listing charge cannot be negative',
      });
    }

    const vendor = await Vendor.findByIdAndUpdate(
      id,
      { listingCharge: parseFloat(listingCharge) },
      { new: true, runValidators: true }
    ).select('restaurantName listingType listingCharge');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Listing charge updated successfully',
      vendor,
    });
  } catch (error) {
    console.error('Update listing charge error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update listing charge',
      error: error.message,
    });
  }
};
