import Subscriber from '../models/Subscriber.js';
import { sendEmail } from '../config/smtp.js';

// @desc    Subscribe from footer (public)
// @route   POST /api/subscribers/subscribe
// @access  Public
export const subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email' });
    }

    const existing = await Subscriber.findOne({ email: email.toLowerCase() });

    if (existing) {
      return res.status(409).json({ success: false, message: 'Already subscribed' });
    }

    const subscriber = await Subscriber.create({
      email: email.toLowerCase(),
      status: 'active',
      source: 'Footer',
    });

    // Send confirmation email (non-blocking — don't fail the request)
    sendEmail({
      to: subscriber.email,
      subject: 'Subscription Confirmed',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
          <div style="text-align:center;margin-bottom:30px;">
            <h1 style="color:#E82335;font-size:28px;margin:0;">Foodzippy</h1>
          </div>
          <h2 style="color:#333;font-size:22px;">Subscription Confirmed</h2>
          <p style="color:#555;font-size:16px;line-height:1.6;">
            Thank you for subscribing to our updates and offers.
          </p>
          <p style="color:#555;font-size:16px;line-height:1.6;">
            You will now receive important notifications, deals, and announcements.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:30px 0;" />
          <p style="color:#999;font-size:12px;text-align:center;">
            &copy; ${new Date().getFullYear()} Foodzippy. All Rights Reserved.
          </p>
        </div>
      `,
    }).catch((err) => console.error('Email send failed:', err.message));

    res.status(201).json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ success: false, message: 'Error subscribing', error: error.message });
  }
};

// @desc    Get all subscribers
// @route   GET /api/subscribers
// @access  Private (Admin)
export const getAllSubscribers = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'all') query.status = status;

    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const subscribers = await Subscriber.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Subscriber.countDocuments(query);

    res.status(200).json({
      success: true,
      data: subscribers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ success: false, message: 'Error fetching subscribers', error: error.message });
  }
};

// @desc    Get subscriber stats
// @route   GET /api/subscribers/stats
// @access  Private (Admin)
export const getSubscriberStats = async (req, res) => {
  try {
    const total = await Subscriber.countDocuments();
    const active = await Subscriber.countDocuments({ status: 'active' });
    const inactive = await Subscriber.countDocuments({ status: 'inactive' });

    res.status(200).json({
      success: true,
      data: { total, active, inactive },
    });
  } catch (error) {
    console.error('Error fetching subscriber stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching stats', error: error.message });
  }
};

// @desc    Update subscriber status
// @route   PATCH /api/subscribers/:id
// @access  Private (Admin)
export const updateSubscriber = async (req, res) => {
  try {
    const { status } = req.body;
    const subscriber = await Subscriber.findByIdAndUpdate(
      req.params.id,
      { ...(status && { status }) },
      { new: true, runValidators: true }
    );

    if (!subscriber) {
      return res.status(404).json({ success: false, message: 'Subscriber not found' });
    }

    res.status(200).json({ success: true, message: 'Subscriber updated', data: subscriber });
  } catch (error) {
    console.error('Error updating subscriber:', error);
    res.status(500).json({ success: false, message: 'Error updating subscriber', error: error.message });
  }
};

// @desc    Delete subscriber
// @route   DELETE /api/subscribers/:id
// @access  Private (Admin)
export const deleteSubscriber = async (req, res) => {
  try {
    const subscriber = await Subscriber.findByIdAndDelete(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ success: false, message: 'Subscriber not found' });
    }
    res.status(200).json({ success: true, message: 'Subscriber deleted' });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    res.status(500).json({ success: false, message: 'Error deleting subscriber', error: error.message });
  }
};

// @desc    Export subscribers as CSV
// @route   GET /api/subscribers/export
// @access  Private (Admin)
export const exportSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find({ status: 'active' }).sort({ createdAt: -1 });

    const csvHeader = 'Email,Status,Source,Subscribed Date\n';
    const csvRows = subscribers
      .map(
        (s) =>
          `${s.email},${s.status},${s.source},${new Date(s.createdAt).toISOString()}`
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=subscribers.csv');
    res.send(csvHeader + csvRows);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Export failed', error: error.message });
  }
};
