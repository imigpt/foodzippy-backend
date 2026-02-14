import Agent from '../models/Agent.js';
import Vendor from '../models/Vendor.js';
import jwt from 'jsonwebtoken';
import cloudinary from '../config/cloudinary.js';

// Generate JWT Token
const generateToken = (agentId, agentName) => {
  return jwt.sign(
    { agentId, agentName },
    process.env.JWT_SECRET || 'your-secret-key-change-this',
    { expiresIn: '7d' }
  );
};

// @desc    Agent Login
// @route   POST /api/agent/login
// @access  Public
export const agentLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password',
      });
    }

    // Find agent by username
    const agent = await Agent.findOne({ username: username.toLowerCase() });

    if (!agent) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    // Check if agent is active
    if (!agent.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact admin.',
      });
    }

    // Check password
    const isPasswordValid = await agent.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    // Generate token
    const token = generateToken(agent._id, agent.name);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      agent: {
        id: agent._id,
        name: agent.name,
        username: agent.username,
      },
    });
  } catch (error) {
    console.error('Agent login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
};

// @desc    Get all agents (Admin only)
// @route   GET /api/agents
// @access  Private (Admin)
export const getAllAgents = async (req, res) => {
  try {
    const agents = await Agent.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: agents.length,
      agents,
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agents',
      error: error.message,
    });
  }
};

// @desc    Create new agent (Admin only)
// @route   POST /api/agents
// @access  Private (Admin)
export const createAgent = async (req, res) => {
  try {
    const { name, username, password } = req.body;

    // Validation
    if (!name || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, username, and password',
      });
    }

    // Check if username already exists
    const existingAgent = await Agent.findOne({ username: username.toLowerCase() });
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists',
      });
    }

    // Create agent
    const agent = await Agent.create({
      name,
      username: username.toLowerCase(),
      password,
    });

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      agent: {
        id: agent._id,
        name: agent.name,
        username: agent.username,
        isActive: agent.isActive,
        createdAt: agent.createdAt,
      },
    });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create agent',
      error: error.message,
    });
  }
};

// @desc    Update agent (Admin only)
// @route   PUT /api/agents/:id
// @access  Private (Admin)
export const updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, password, email, phone, alternatePhone, dob, agentType, isActive } = req.body;

    const agent = await Agent.findById(id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    // Check if new username conflicts with another agent
    if (username && username.toLowerCase() !== agent.username) {
      const existingAgent = await Agent.findOne({ username: username.toLowerCase() });
      if (existingAgent) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists',
        });
      }
      agent.username = username.toLowerCase();
    }

    // Update fields
    if (name) agent.name = name;
    if (email !== undefined) agent.email = email;
    if (phone !== undefined) agent.phone = phone;
    if (alternatePhone !== undefined) agent.alternatePhone = alternatePhone;
    if (agentType) agent.agentType = agentType;
    if (password) agent.password = password; // Will be hashed by pre-save hook
    if (typeof isActive === 'boolean') agent.isActive = isActive;
    
    // Update date of birth and calculate age
    if (dob !== undefined) {
      agent.dob = dob ? new Date(dob) : null;
      if (agent.dob) {
        const today = new Date();
        const birthDate = new Date(agent.dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        agent.age = age;
      } else {
        agent.age = null;
      }
    }

    await agent.save();

    res.status(200).json({
      success: true,
      message: 'Agent updated successfully',
      agent: {
        id: agent._id,
        name: agent.name,
        username: agent.username,
        email: agent.email,
        phone: agent.phone,
        alternatePhone: agent.alternatePhone,
        dob: agent.dob,
        age: agent.age,
        agentType: agent.agentType,
        isActive: agent.isActive,
      },
    });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update agent',
      error: error.message,
    });
  }
};

// @desc    Get single agent by ID (Admin only)
// @route   GET /api/agents/:id
// @access  Private (Admin)
export const getAgentById = async (req, res) => {
  try {
    const { id } = req.params;

    const agent = await Agent.findById(id).select('-password');

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    res.status(200).json({
      success: true,
      agent,
    });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent',
      error: error.message,
    });
  }
};

// @desc    Delete agent (Admin only)
// @route   DELETE /api/agents/:id
// @access  Private (Admin)
export const deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;

    const agent = await Agent.findById(id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    await Agent.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Agent deleted successfully',
    });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete agent',
      error: error.message,
    });
  }
};

// ========================================
// AGENT SELF-SERVICE APIs
// ========================================

// @desc    Get agent's own profile
// @route   GET /api/agent/profile
// @access  Private (Agent)
export const getMyProfile = async (req, res) => {
  try {
    const agentId = req.agent.agentId;

    const agent = await Agent.findById(agentId).select('-password');

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    res.status(200).json({
      success: true,
      agent,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
    });
  }
};

// @desc    Update agent's own profile (email, dob, profileImage only)
// @route   PUT /api/agent/profile
// @access  Private (Agent)
export const updateMyProfile = async (req, res) => {
  try {
    const agentId = req.agent.agentId;
    const { email, dob } = req.body;

    const agent = await Agent.findById(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    // Only allow updating specific fields
    if (email !== undefined) {
      agent.email = email;
    }
    if (dob !== undefined) {
      agent.dob = dob ? new Date(dob) : null;
      // Calculate age if dob is provided
      if (agent.dob) {
        const today = new Date();
        const birthDate = new Date(agent.dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        agent.age = age;
      }
    }

    // Handle profile image from request file (multer)
    if (req.file) {
      // Delete old image from Cloudinary if exists
      if (agent.profileImage) {
        try {
          // Extract public_id from Cloudinary URL
          const urlParts = agent.profileImage.split('/');
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
        folder: 'agents',
        resource_type: 'image',
      });
      
      agent.profileImage = uploadResult.secure_url;
    }

    await agent.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      agent: {
        id: agent._id,
        name: agent.name,
        username: agent.username,
        email: agent.email,
        phone: agent.phone,
        dob: agent.dob,
        age: agent.age,
        agentType: agent.agentType,
        profileImage: agent.profileImage,
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

// @desc    Get agent's vendors
// @route   GET /api/agent/vendors
// @access  Private (Agent)
export const getMyVendors = async (req, res) => {
  try {
    const agentId = req.agent.agentId;

    const vendors = await Vendor.find({ agentId }).sort({ createdAt: -1 });

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

// @desc    Request edit permission for a vendor
// @route   POST /api/agent/vendors/:id/request-edit
// @access  Private (Agent)
export const requestVendorEdit = async (req, res) => {
  try {
    const agentId = req.agent.agentId;
    const { id } = req.params;
    const { remark } = req.body;

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Verify this vendor belongs to the agent
    if (vendor.agentId.toString() !== agentId.toString()) {
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
// @route   PUT /api/agent/vendors/:id
// @access  Private (Agent)
export const updateMyVendor = async (req, res) => {
  try {
    const agentId = req.agent.agentId;
    const { id } = req.params;

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Verify this vendor belongs to the agent
    if (vendor.agentId.toString() !== agentId.toString()) {
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

    // Update allowed fields
    const allowedFields = [
      'restaurantName',
      'approxDeliveryTime',
      'approxPriceForTwo',
      'mobileNumber',
      'shortDescription',
      'services',
      'isPureVeg',
      'isPopular',
      'deliveryChargeType',
      'fixedCharge',
      'dynamicCharge',
      'deliveryRadius',
      'minimumOrderPrice',
      'fullAddress',
      'pincode',
      'landmark',
      'latitude',
      'longitude',
      'city',
      'state',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        vendor[field] = req.body[field];
      }
    });

    // Handle image upload if present
    if (req.file) {
      vendor.restaurantImage = req.file.path;
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
