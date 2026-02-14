import FranchiseInquiry from '../models/FranchiseInquiry.js';

// @desc    Create a new franchise inquiry
// @route   POST /api/franchise-inquiry
// @access  Public
export const createFranchiseInquiry = async (req, res) => {
  try {
    const { name, email, phone, description } = req.body;

    // Validation
    if (!name || !email || !phone || !description) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    // Create franchise inquiry
    const franchiseInquiry = await FranchiseInquiry.create({
      name,
      email,
      phone,
      description,
    });

    res.status(201).json({
      success: true,
      message: 'Franchise inquiry submitted successfully',
      data: franchiseInquiry,
    });
  } catch (error) {
    console.error('Error creating franchise inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting franchise inquiry',
      error: error.message,
    });
  }
};

// @desc    Get all franchise inquiries
// @route   GET /api/franchise-inquiry
// @access  Private (Admin)
export const getAllFranchiseInquiries = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Get inquiries
    const inquiries = await FranchiseInquiry.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await FranchiseInquiry.countDocuments(query);

    res.status(200).json({
      success: true,
      data: inquiries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching franchise inquiries:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching franchise inquiries',
      error: error.message,
    });
  }
};

// @desc    Get a single franchise inquiry
// @route   GET /api/franchise-inquiry/:id
// @access  Private (Admin)
export const getFranchiseInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    const inquiry = await FranchiseInquiry.findById(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Franchise inquiry not found',
      });
    }

    res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error('Error fetching franchise inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching franchise inquiry',
      error: error.message,
    });
  }
};

// @desc    Update franchise inquiry status
// @route   PATCH /api/franchise-inquiry/:id
// @access  Private (Admin)
export const updateFranchiseInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const inquiry = await FranchiseInquiry.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Franchise inquiry not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Franchise inquiry updated successfully',
      data: inquiry,
    });
  } catch (error) {
    console.error('Error updating franchise inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating franchise inquiry',
      error: error.message,
    });
  }
};

// @desc    Delete franchise inquiry
// @route   DELETE /api/franchise-inquiry/:id
// @access  Private (Admin)
export const deleteFranchiseInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    const inquiry = await FranchiseInquiry.findByIdAndDelete(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Franchise inquiry not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Franchise inquiry deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting franchise inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting franchise inquiry',
      error: error.message,
    });
  }
};

// @desc    Get franchise inquiry statistics
// @route   GET /api/franchise-inquiry/stats
// @access  Private (Admin)
export const getFranchiseInquiryStats = async (req, res) => {
  try {
    const stats = await FranchiseInquiry.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await FranchiseInquiry.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus: stats,
      },
    });
  } catch (error) {
    console.error('Error fetching franchise inquiry stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message,
    });
  }
};
