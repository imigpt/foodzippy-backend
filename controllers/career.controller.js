import CareerApplication from '../models/CareerApplication.js';
import { sendEmail } from '../config/smtp.js';
import { careerApplicationReceived, careerStatusUpdate, adminNewSubmissionNotice } from '../config/emailTemplates.js';

// @desc    Submit a career application
// @route   POST /api/careers/apply
// @access  Public
export const createCareerApplication = async (req, res) => {
  try {
    const { fullName, email, phone, position, city, message } = req.body;

    if (!fullName || !email || !phone || !position || !city) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, phone, position and city are required',
      });
    }

    const application = await CareerApplication.create({
      fullName,
      email,
      phone,
      position,
      city,
      message: message || '',
      // resumeUrl can be added later if Cloudinary upload is wired up
      resumeUrl: '',
    });

    // Send confirmation email to applicant (non-blocking)
    sendEmail({
      to: email,
      ...careerApplicationReceived({ fullName, position, city }),
    }).catch((err) => console.error('Email send failed:', err.message));

    // Notify admin about new application
    const adminEmail = process.env.SMTP_USER;
    if (adminEmail) {
      sendEmail({
        to: adminEmail,
        ...adminNewSubmissionNotice({ type: 'Career Application', name: fullName, email, details: `Position: ${position}, City: ${city}` }),
      }).catch((err) => console.error('Email send failed:', err.message));
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application,
    });
  } catch (error) {
    console.error('Error creating career application:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting application',
      error: error.message,
    });
  }
};

// @desc    Get all career applications
// @route   GET /api/careers
// @access  Private (Admin)
export const getAllCareerApplications = async (req, res) => {
  try {
    const { status, position, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status) query.status = status;
    if (position) query.position = { $regex: position, $options: 'i' };

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const applications = await CareerApplication.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CareerApplication.countDocuments(query);

    res.status(200).json({
      success: true,
      data: applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching career applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching career applications',
      error: error.message,
    });
  }
};

// @desc    Get single career application
// @route   GET /api/careers/:id
// @access  Private (Admin)
export const getCareerApplication = async (req, res) => {
  try {
    const application = await CareerApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    console.error('Error fetching career application:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching career application',
      error: error.message,
    });
  }
};

// @desc    Update career application status / notes
// @route   PATCH /api/careers/:id
// @access  Private (Admin)
export const updateCareerApplication = async (req, res) => {
  try {
    const { status, notes } = req.body;

    const application = await CareerApplication.findByIdAndUpdate(
      req.params.id,
      { ...(status && { status }), ...(notes !== undefined && { notes }) },
      { new: true, runValidators: true }
    );

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Send status update email if status changed and applicant has email
    if (status && application.email) {
      sendEmail({
        to: application.email,
        ...careerStatusUpdate({ fullName: application.fullName, position: application.position, status }),
      }).catch((err) => console.error('Email send failed:', err.message));
    }

    res.status(200).json({
      success: true,
      message: 'Application updated successfully',
      data: application,
    });
  } catch (error) {
    console.error('Error updating career application:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating application',
      error: error.message,
    });
  }
};

// @desc    Delete career application
// @route   DELETE /api/careers/:id
// @access  Private (Admin)
export const deleteCareerApplication = async (req, res) => {
  try {
    const application = await CareerApplication.findByIdAndDelete(req.params.id);

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.status(200).json({ success: true, message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Error deleting career application:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting application',
      error: error.message,
    });
  }
};

// @desc    Get stats
// @route   GET /api/careers/stats
// @access  Private (Admin)
export const getCareerApplicationStats = async (req, res) => {
  try {
    const total = await CareerApplication.countDocuments();
    const byStatus = await CareerApplication.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byPosition = await CareerApplication.aggregate([
      { $group: { _id: '$position', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: { total, byStatus, byPosition },
    });
  } catch (error) {
    console.error('Error fetching career stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
      error: error.message,
    });
  }
};
