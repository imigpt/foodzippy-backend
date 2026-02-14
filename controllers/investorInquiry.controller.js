import InvestorInquiry from '../models/InvestorInquiry.js';

// @desc    Create a new investor inquiry
// @route   POST /api/investor-inquiry
// @access  Public
export const createInvestorInquiry = async (req, res) => {
  try {
    const { name, email, phone, city, state, companyName } = req.body;

    // Validation
    if (!name || !email || !phone || !city || !state) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided',
      });
    }

    // Create investor inquiry
    const investorInquiry = await InvestorInquiry.create({
      name,
      email,
      phone,
      city,
      state,
      companyName: companyName || '',
    });

    res.status(201).json({
      success: true,
      message: 'Investor inquiry submitted successfully',
      data: investorInquiry,
    });
  } catch (error) {
    console.error('Error creating investor inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting investor inquiry',
      error: error.message,
    });
  }
};

// @desc    Get all investor inquiries
// @route   GET /api/investor-inquiry
// @access  Private (Admin)
export const getAllInvestorInquiries = async (req, res) => {
  try {
    const { status, search, city, state, page = 1, limit = 20 } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }

    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    if (state) {
      query.state = { $regex: state, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Get inquiries
    const inquiries = await InvestorInquiry.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await InvestorInquiry.countDocuments(query);

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
    console.error('Error fetching investor inquiries:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching investor inquiries',
      error: error.message,
    });
  }
};

// @desc    Get a single investor inquiry
// @route   GET /api/investor-inquiry/:id
// @access  Private (Admin)
export const getInvestorInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    const inquiry = await InvestorInquiry.findById(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Investor inquiry not found',
      });
    }

    res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error('Error fetching investor inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching investor inquiry',
      error: error.message,
    });
  }
};

// @desc    Update investor inquiry status
// @route   PATCH /api/investor-inquiry/:id
// @access  Private (Admin)
export const updateInvestorInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const inquiry = await InvestorInquiry.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Investor inquiry not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Investor inquiry updated successfully',
      data: inquiry,
    });
  } catch (error) {
    console.error('Error updating investor inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating investor inquiry',
      error: error.message,
    });
  }
};

// @desc    Delete investor inquiry
// @route   DELETE /api/investor-inquiry/:id
// @access  Private (Admin)
export const deleteInvestorInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    const inquiry = await InvestorInquiry.findByIdAndDelete(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Investor inquiry not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Investor inquiry deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting investor inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting investor inquiry',
      error: error.message,
    });
  }
};

// @desc    Get investor inquiry statistics
// @route   GET /api/investor-inquiry/stats
// @access  Private (Admin)
export const getInvestorInquiryStats = async (req, res) => {
  try {
    const stats = await InvestorInquiry.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await InvestorInquiry.countDocuments();

    // Get location stats
    const locationStats = await InvestorInquiry.aggregate([
      {
        $group: {
          _id: { city: '$city', state: '$state' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus: stats,
        topLocations: locationStats,
      },
    });
  } catch (error) {
    console.error('Error fetching investor inquiry stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message,
    });
  }
};
