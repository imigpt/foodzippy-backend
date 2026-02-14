import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import jwt from 'jsonwebtoken';
import cloudinary from '../config/cloudinary.js';
import { createFollowUpNotification } from './notification.controller.js';

// Generate JWT Token
const generateToken = (userId, userName, role) => {
  return jwt.sign(
    { userId, userName, role },
    process.env.JWT_SECRET || 'your-secret-key-change-this',
    { expiresIn: '7d' }
  );
};

// @desc    User Login (Agent or Employee)
// @route   POST /api/users/agent/login OR POST /api/users/employee/login
// @access  Public
export const userLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password',
      });
    }

    // Determine role from route path
    const userRole = req.path.includes('agent') ? 'agent' : 'employee';

    console.log('=== USER LOGIN ATTEMPT ===');
    console.log('Username:', username);
    console.log('Role from path:', userRole);
    console.log('Path:', req.path);
    console.log('BaseUrl:', req.baseUrl);

    // Find user by username and role
    const user = await User.findOne({ 
      username: username.toLowerCase(),
      role: userRole
    });

    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact admin.',
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    // Generate token
    const token = generateToken(user._id, user.name, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
};

// @desc    Get all users by role (Admin only)
// @route   GET /api/users?role=agent OR GET /api/users?role=employee
// @access  Private (Admin)
export const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    
    const filter = {};
    if (role && ['agent', 'employee'].includes(role)) {
      filter.role = role;
    }

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

// @desc    Create new user (Admin only)
// @route   POST /api/users
// @access  Private (Admin)
export const createUser = async (req, res) => {
  try {
    const { name, username, password, role } = req.body;

    // Validation
    if (!name || !username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, username, password, and role',
      });
    }

    // Validate role
    if (!['agent', 'employee'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "agent" or "employee"',
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists',
      });
    }

    // Create user
    const user = await User.create({
      name,
      username: username.toLowerCase(),
      password,
      role,
    });

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully`,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
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

// @desc    Update user (Admin only)
// @route   PUT /api/users/:id
// @access  Private (Admin)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, password, email, phone, alternatePhone, dob, role, isActive } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if new username conflicts with another user
    if (username && username.toLowerCase() !== user.username) {
      const existingUser = await User.findOne({ username: username.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists',
        });
      }
      user.username = username.toLowerCase();
    }

    // Update fields
    if (name) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (alternatePhone !== undefined) user.alternatePhone = alternatePhone;
    if (role && ['agent', 'employee'].includes(role)) user.role = role;
    if (password) user.password = password; // Will be hashed by pre-save hook
    if (typeof isActive === 'boolean') user.isActive = isActive;
    
    // Update date of birth and calculate age
    if (dob !== undefined) {
      user.dob = dob ? new Date(dob) : null;
      if (user.dob) {
        const today = new Date();
        const birthDate = new Date(user.dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        user.age = age;
      } else {
        user.age = null;
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        alternatePhone: user.alternatePhone,
        dob: user.dob,
        age: user.age,
        role: user.role,
        isActive: user.isActive,
      },
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

// @desc    Get single user by ID (Admin only)
// @route   GET /api/users/:id
// @access  Private (Admin)
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

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private (Admin)
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
      message: 'User deleted successfully',
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

// ========================================
// USER SELF-SERVICE APIs (Agent/Employee)
// ========================================

// @desc    Get user's own profile
// @route   GET /api/agent/profile OR GET /api/employee/profile
// @access  Private (User)
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select('-password');

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
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
    });
  }
};

// @desc    Update user's own profile (email, dob, profileImage only)
// @route   PUT /api/agent/profile OR PUT /api/employee/profile
// @access  Private (User)
export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { email, dob } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Only allow updating specific fields
    if (email !== undefined) {
      user.email = email;
    }
    if (dob !== undefined) {
      user.dob = dob ? new Date(dob) : null;
      // Calculate age if dob is provided
      if (user.dob) {
        const today = new Date();
        const birthDate = new Date(user.dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        user.age = age;
      }
    }

    // Handle profile image from request file (multer)
    if (req.file) {
      // Delete old image from Cloudinary if exists
      if (user.profileImage) {
        try {
          // Extract public_id from Cloudinary URL
          const urlParts = user.profileImage.split('/');
          const publicIdWithExt = urlParts[urlParts.length - 1];
          const publicId = publicIdWithExt.split('.')[0];
          const folder = urlParts[urlParts.length - 2];
          await cloudinary.uploader.destroy(`${folder}/${publicId}`);
        } catch (err) {
          console.error('Error deleting old image from Cloudinary:', err);
        }
      }

      // Upload new image to Cloudinary
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      
      const uploadResult = await cloudinary.uploader.upload(dataURI, {
        folder: 'users',
        resource_type: 'image',
      });
      
      user.profileImage = uploadResult.secure_url;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        dob: user.dob,
        age: user.age,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

// @desc    Get user's vendors
// @route   GET /api/agent/vendors OR GET /api/employee/vendors
// @access  Private (User)
export const getMyVendors = async (req, res) => {
  try {
    const userId = req.user.userId;

    const vendors = await Vendor.find({ createdById: userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vendors.length,
      vendors,
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors',
    });
  }
};

// @desc    Get single vendor by ID
// @route   GET /api/agent/vendors/:id OR GET /api/employee/vendors/:id
// @access  Private (User)
export const getMyVendorById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Verify this vendor belongs to the user
    if (vendor.createdById.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own vendors',
      });
    }

    res.status(200).json({
      success: true,
      vendor,
    });
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor',
    });
  }
};

// @desc    Request edit permission for a vendor
// @route   POST /api/agent/vendors/:id/request-edit OR POST /api/employee/vendors/:id/request-edit
// @access  Private (User)
export const requestVendorEdit = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { remark } = req.body;

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Verify this vendor belongs to the user
    if (vendor.createdById.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only request edit for your own vendors',
      });
    }

    // Check if edit already requested
    if (vendor.editRequested && !vendor.editApproved) {
      return res.status(400).json({
        success: false,
        message: 'Edit request already pending',
      });
    }

    vendor.editRequested = true;
    vendor.editApproved = false;
    vendor.editRequestDate = new Date();
    vendor.editRemark = remark || '';
    vendor.editSeenByAdmin = false; // Reset to ensure notification appears in admin panel

    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Edit request submitted successfully',
      vendor,
    });
  } catch (error) {
    console.error('Request edit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request edit',
    });
  }
};

// @desc    Update vendor (only if edit approved)
// @route   PUT /api/agent/vendors/:id OR PUT /api/employee/vendors/:id
// @access  Private (User)
export const updateMyVendor = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Verify this vendor belongs to the user
    if (vendor.createdById.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own vendors',
      });
    }

    // Check if edit is approved
    if (!vendor.editApproved) {
      return res.status(403).json({
        success: false,
        message: 'Edit not approved by admin. Please request edit permission first.',
      });
    }

    // ==========================================
    // 1. UPDATE RESTAURANT IMAGE (if provided)
    // ==========================================
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'foodzippy/vendors',
            resource_type: 'image',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      vendor.restaurantImage = uploadResult;
    }

    // ==========================================
    // 2. UPDATE DYNAMIC FORM DATA
    // ==========================================
    if (req.body.formData) {
      let formData;
      try {
        formData = typeof req.body.formData === 'string' 
          ? JSON.parse(req.body.formData) 
          : req.body.formData;
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid formData format',
        });
      }

      // Update core system fields from formData
      if (formData.restaurantName) vendor.restaurantName = formData.restaurantName;
      if (formData.fullAddress) vendor.fullAddress = formData.fullAddress;
      if (formData.latitude) vendor.latitude = formData.latitude;
      if (formData.longitude) vendor.longitude = formData.longitude;

      // Update the formData map
      vendor.formData = new Map(Object.entries(formData));
    }

    // ==========================================
    // 3. UPDATE REVIEW SECTION
    // ==========================================
    if (req.body.review) {
      let reviewData;
      try {
        reviewData = typeof req.body.review === 'string' 
          ? JSON.parse(req.body.review) 
          : req.body.review;
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid review data format',
        });
      }

      // Check if follow-up date is being updated
      if (reviewData.followUpDate !== undefined && 
          reviewData.followUpDate !== vendor.review?.followUpDate) {
        
        const oldDate = vendor.review?.followUpDate;
        const newDate = reviewData.followUpDate;

        // Get user details from the authenticated user
        const user = await User.findById(userId);
        
        if (user) {
          // Create notification for admin
          await createFollowUpNotification(
            vendor._id,
            userId,
            user.name || user.userName,
            user.role,
            oldDate,
            newDate
          );
        }
      }

      vendor.review = { ...vendor.review, ...reviewData };
    }

    // Reset edit flags after update
    vendor.editApproved = false;
    vendor.editRequested = false;

    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Vendor updated successfully',
      vendor,
    });
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vendor',
    });
  }
};
