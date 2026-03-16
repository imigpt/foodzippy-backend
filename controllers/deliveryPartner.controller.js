import DeliveryPartner from '../models/DeliveryPartner.js';
import EmailTemplate from '../models/EmailTemplate.js';
import { sendEmail } from '../config/smtp.js';
import { deliveryPartnerApplicationReceived, deliveryPartnerRejected, adminNewSubmissionNotice } from '../config/emailTemplates.js';
import bcrypt from 'bcryptjs';

// @desc    Submit delivery partner application (public)
// @route   POST /api/delivery-partners/apply
// @access  Public
export const applyDeliveryPartner = async (req, res) => {
  try {
    const { fullName, phone, email, address } = req.body;

    if (!fullName || !phone || !email || !address) {
      return res.status(400).json({
        success: false,
        message: 'Full name, phone, email and address are required',
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    if (!/^\d{10,15}$/.test(phone.replace(/[\s\-\+]/g, ''))) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }

    // Check duplicate
    const existing = await DeliveryPartner.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An application with this email already exists' });
    }

    const application = await DeliveryPartner.create({
      fullName,
      phone,
      email: email.toLowerCase(),
      address,
    });

    // Send confirmation email to applicant (non-blocking)
    sendEmail({
      to: email.toLowerCase(),
      ...deliveryPartnerApplicationReceived({ fullName }),
    }).catch((err) => console.error('Email send failed:', err.message));

    // Notify admin
    const adminEmail = process.env.SMTP_USER;
    if (adminEmail) {
      sendEmail({
        to: adminEmail,
        ...adminNewSubmissionNotice({ type: 'Delivery Partner Application', name: fullName, email, details: `Phone: ${phone}, Address: ${address}` }),
      }).catch((err) => console.error('Email send failed:', err.message));
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application,
    });
  } catch (error) {
    console.error('Delivery partner apply error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'An application with this email already exists' });
    }
    res.status(500).json({ success: false, message: 'Error submitting application', error: error.message });
  }
};

// @desc    Get all delivery partner applications
// @route   GET /api/delivery-partners
// @access  Private (Admin)
export const getAllDeliveryPartners = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'all') query.status = status;

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const applications = await DeliveryPartner.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DeliveryPartner.countDocuments(query);

    res.status(200).json({
      success: true,
      data: applications,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching delivery partners:', error);
    res.status(500).json({ success: false, message: 'Error fetching applications', error: error.message });
  }
};

// @desc    Get single delivery partner
// @route   GET /api/delivery-partners/:id
// @access  Private (Admin)
export const getDeliveryPartner = async (req, res) => {
  try {
    const dp = await DeliveryPartner.findById(req.params.id);
    if (!dp) return res.status(404).json({ success: false, message: 'Application not found' });
    res.status(200).json({ success: true, data: dp });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching application', error: error.message });
  }
};

// @desc    Get delivery partner stats
// @route   GET /api/delivery-partners/stats
// @access  Private (Admin)
export const getDeliveryPartnerStats = async (req, res) => {
  try {
    const total = await DeliveryPartner.countDocuments();
    const pending = await DeliveryPartner.countDocuments({ status: 'Pending' });
    const approved = await DeliveryPartner.countDocuments({ status: 'Approved' });
    const rejected = await DeliveryPartner.countDocuments({ status: 'Rejected' });
    res.status(200).json({ success: true, data: { total, pending, approved, rejected } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching stats', error: error.message });
  }
};

// @desc    Approve delivery partner + create credentials + send email
// @route   POST /api/delivery-partners/:id/approve
// @access  Private (Admin)
export const approveDeliveryPartner = async (req, res) => {
  try {
    const { loginId, password, emailSubject, emailBody } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ success: false, message: 'Login ID and password are required' });
    }

    const dp = await DeliveryPartner.findById(req.params.id);
    if (!dp) return res.status(404).json({ success: false, message: 'Application not found' });

    if (dp.status === 'Approved') {
      return res.status(400).json({ success: false, message: 'Application already approved' });
    }

    // Check loginId uniqueness
    const existingLogin = await DeliveryPartner.findOne({ loginId });
    if (existingLogin) {
      return res.status(409).json({ success: false, message: 'This Login ID is already taken' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    dp.status = 'Approved';
    dp.loginId = loginId;
    dp.passwordHash = passwordHash;
    dp.approvedBy = req.admin?.email || 'admin';
    await dp.save();

    // Build email from provided body or load template
    let subject = emailSubject || 'Delivery Partner Application Approved';
    let body = emailBody || '';

    if (!body) {
      // Try to load template from DB
      const template = await EmailTemplate.findOne({ name: 'delivery_partner_approval' });
      if (template) {
        subject = template.subject;
        body = template.body;
      } else {
        body = `Dear {{name}},\n\nCongratulations! Your application has been approved.\n\nLogin Details:\nID: {{loginId}}\nPassword: {{password}}\n\nPlease keep this information secure.\n\nYou can now log in to the Delivery Partner portal.\n\nRegards,\n{{appName}}`;
      }
    }

    // Replace placeholders
    const replacements = {
      '{{name}}': dp.fullName,
      '{{loginId}}': loginId,
      '{{password}}': password,
      '{{appName}}': 'Foodzippy',
      '{{email}}': dp.email,
      '{{phone}}': dp.phone,
    };

    let htmlBody = body;
    for (const [key, val] of Object.entries(replacements)) {
      htmlBody = htmlBody.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), val);
    }

    // Convert newlines to HTML
    const htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
        <div style="text-align:center;margin-bottom:30px;">
          <h1 style="color:#E82335;font-size:28px;margin:0;">Foodzippy</h1>
        </div>
        <div style="color:#333;font-size:16px;line-height:1.6;">
          ${htmlBody.replace(/\n/g, '<br/>')}
        </div>
        <hr style="border:none;border-top:1px solid #eee;margin:30px 0;" />
        <p style="color:#999;font-size:12px;text-align:center;">
          &copy; ${new Date().getFullYear()} Foodzippy. All Rights Reserved.
        </p>
      </div>
    `;

    // Send email and await result so we can report success/failure
    const emailResult = await sendEmail({ to: dp.email, subject, html: htmlContent });

    res.status(200).json({
      success: true,
      message: emailResult.success
        ? 'Application approved and credentials sent via email'
        : `Application approved but email failed to send: ${emailResult.error}`,
      emailSent: emailResult.success,
      data: dp,
    });
  } catch (error) {
    console.error('Error approving delivery partner:', error);
    res.status(500).json({ success: false, message: 'Error approving application', error: error.message });
  }
};

// @desc    Reject delivery partner
// @route   POST /api/delivery-partners/:id/reject
// @access  Private (Admin)
export const rejectDeliveryPartner = async (req, res) => {
  try {
    const { reason } = req.body;
    const dp = await DeliveryPartner.findById(req.params.id);
    if (!dp) return res.status(404).json({ success: false, message: 'Application not found' });

    dp.status = 'Rejected';
    dp.rejectionReason = reason || '';
    await dp.save();

    // Send rejection email (non-blocking)
    if (dp.email) {
      sendEmail({
        to: dp.email,
        ...deliveryPartnerRejected({ fullName: dp.fullName, reason }),
      }).catch((err) => console.error('Email send failed:', err.message));
    }

    res.status(200).json({ success: true, message: 'Application rejected', data: dp });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error rejecting application', error: error.message });
  }
};

// @desc    Delete delivery partner
// @route   DELETE /api/delivery-partners/:id
// @access  Private (Admin)
export const deleteDeliveryPartner = async (req, res) => {
  try {
    const dp = await DeliveryPartner.findByIdAndDelete(req.params.id);
    if (!dp) return res.status(404).json({ success: false, message: 'Application not found' });
    res.status(200).json({ success: true, message: 'Application deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting application', error: error.message });
  }
};

// @desc    Delivery Partner Login
// @route   POST /api/delivery-partners/login
// @access  Public
export const deliveryPartnerLogin = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ success: false, message: 'Login ID and password are required' });
    }

    const dp = await DeliveryPartner.findOne({ loginId, status: 'Approved' });
    if (!dp) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, dp.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        id: dp._id,
        fullName: dp.fullName,
        email: dp.email,
        phone: dp.phone,
        loginId: dp.loginId,
      },
    });
  } catch (error) {
    console.error('Delivery partner login error:', error);
    res.status(500).json({ success: false, message: 'Login error', error: error.message });
  }
};
