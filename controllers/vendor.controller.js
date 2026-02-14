import Vendor from '../models/Vendor.js';
import VendorFormConfig from '../models/VendorFormConfig.js';
import cloudinary from '../config/cloudinary.js';

export const registerVendor = async (req, res) => {
  try {
    // ==========================================
    // 0. VALIDATE VENDOR TYPE
    // ==========================================
    const vendorType = req.body.vendorType || 'restaurant';
    
    if (!vendorType) {
      return res.status(400).json({
        success: false,
        message: 'Vendor type is required',
      });
    }

    // ==========================================
    // 1. VALIDATE REVIEW SECTION
    // ==========================================
    if (!req.body.review) {
      return res.status(400).json({
        success: false,
        message: 'Review section is required',
      });
    }

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

    // Get review field configs to check required fields
    const reviewFieldConfigs = await VendorFormConfig.find({
      section: 'review_info',
      isActive: true,
    });

    // Validate required review fields
    for (const fieldConfig of reviewFieldConfigs) {
      if (fieldConfig.required && !reviewData[fieldConfig.fieldKey]) {
        return res.status(400).json({
          success: false,
          message: `${fieldConfig.label} is required in review section`,
        });
      }
    }

    // ==========================================
    // 2. VALIDATE & UPLOAD IMAGE
    // ==========================================
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant image is required',
      });
    }

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

    // ==========================================
    // 3. GET FORM CONFIG & VALIDATE (filter by vendor type)
    // ==========================================
    const formFieldsQuery = {
      isActive: true,
      section: { $ne: 'review_info' }, // Exclude review section
      $or: [
        { vendorTypes: vendorType },
        { vendorTypes: { $size: 0 } }, // Empty array means applies to all types
      ],
    };
    
    const formFields = await VendorFormConfig.find(formFieldsQuery);

    // Parse formData from request
    let formData = {};
    try {
      formData = typeof req.body.formData === 'string' 
        ? JSON.parse(req.body.formData) 
        : req.body.formData || {};
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid formData format',
      });
    }

    // Security: Remove restaurantStatus from formData if present
    // Only admin should be able to change vendor status
    delete formData.restaurantStatus;

    // Validate required fields
    const missingFields = [];
    for (const fieldConfig of formFields) {
      // Skip system fields that are handled separately or automatically
      const systemFields = ['restaurantImage', 'restaurantStatus', 'restaurantName', 'fullAddress', 'latitude', 'longitude'];
      if (systemFields.includes(fieldConfig.fieldKey)) {
        continue;
      }
      
      if (fieldConfig.required && !formData[fieldConfig.fieldKey]) {
        missingFields.push(fieldConfig.label);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing',
        missingFields,
      });
    }

    // ==========================================
    // 4. EXTRACT SYSTEM FIELDS
    // ==========================================
    // These fields are required at schema level
    const restaurantName = formData.restaurantName || req.body.restaurantName;
    const fullAddress = formData.fullAddress || req.body.fullAddress;
    const latitude = formData.latitude || req.body.latitude;
    const longitude = formData.longitude || req.body.longitude;

    if (!restaurantName || !fullAddress || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant name, address, latitude, and longitude are required',
      });
    }

    // ==========================================
    // 5. CREATE VENDOR
    // ==========================================
    const vendorData = {
      // Vendor type (NEW)
      vendorType: vendorType.toLowerCase(),

      // System fields (required by schema)
      restaurantName,
      restaurantImage: uploadResult,
      restaurantStatus: 'pending',
      fullAddress,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),

      // Dynamic form data (all other fields)
      formData: new Map(Object.entries(formData)),

      // Review section (structured)
      review: {
        followUpDate: reviewData.followUpDate ? new Date(reviewData.followUpDate) : undefined,
        convincingStatus: reviewData.convincingStatus,
        behavior: reviewData.behavior,
        audioUrl: reviewData.audioUrl || null,
      },

      // User tracking (from JWT token)
      createdByName: req.body.agentName || (req.user?.name || req.agent?.name),
      createdById: req.user?.userId || req.agent?.id,
      createdByUsername: req.user?.username || req.agent?.username,
      createdByRole: req.user?.role || 'agent',
    };

    const vendor = await Vendor.create(vendorData);

    res.status(201).json({
      success: true,
      message: 'Vendor registration submitted successfully',
      data: vendor,
    });
  } catch (error) {
    console.error('Vendor Registration Error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

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
      message: 'Failed to register vendor',
      error: error.message,
    });
  }
};

// @desc    Get unread vendor requests count
// @route   GET /api/admin/vendors/unread-count
// @access  Private (Admin)
export const getUnreadVendorRequestsCount = async (req, res) => {
  try {
    const count = await Vendor.countDocuments({
      restaurantStatus: 'pending',
      isSeenByAdmin: { $ne: true }
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Get unread vendor requests count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread vendor requests count',
      error: error.message,
    });
  }
};

// @desc    Mark vendor requests as seen
// @route   PATCH /api/admin/vendors/mark-seen
// @access  Private (Admin)
export const markVendorRequestsAsSeen = async (req, res) => {
  try {
    const result = await Vendor.updateMany(
      {
        restaurantStatus: 'pending',
        isSeenByAdmin: { $ne: true }
      },
      {
        $set: { isSeenByAdmin: true }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Vendor requests marked as seen',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Mark vendor requests as seen error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark vendor requests as seen',
      error: error.message,
    });
  }
};
