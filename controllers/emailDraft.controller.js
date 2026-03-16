import EmailDraft from '../models/EmailDraft.js';
import Subscriber from '../models/Subscriber.js';
import { sendEmail } from '../config/smtp.js';

// @desc    Create email draft
// @route   POST /api/email-drafts
// @access  Private (Admin)
export const createDraft = async (req, res) => {
  try {
    const { subject, body } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ success: false, message: 'Subject and body are required' });
    }

    const draft = await EmailDraft.create({ subject, body });

    res.status(201).json({ success: true, message: 'Draft created', data: draft });
  } catch (error) {
    console.error('Error creating draft:', error);
    res.status(500).json({ success: false, message: 'Error creating draft', error: error.message });
  }
};

// @desc    Get all drafts
// @route   GET /api/email-drafts
// @access  Private (Admin)
export const getAllDrafts = async (req, res) => {
  try {
    const drafts = await EmailDraft.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: drafts });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({ success: false, message: 'Error fetching drafts', error: error.message });
  }
};

// @desc    Get single draft
// @route   GET /api/email-drafts/:id
// @access  Private (Admin)
export const getDraft = async (req, res) => {
  try {
    const draft = await EmailDraft.findById(req.params.id);
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });
    res.status(200).json({ success: true, data: draft });
  } catch (error) {
    console.error('Error fetching draft:', error);
    res.status(500).json({ success: false, message: 'Error fetching draft', error: error.message });
  }
};

// @desc    Update draft
// @route   PATCH /api/email-drafts/:id
// @access  Private (Admin)
export const updateDraft = async (req, res) => {
  try {
    const { subject, body } = req.body;
    const draft = await EmailDraft.findByIdAndUpdate(
      req.params.id,
      { ...(subject && { subject }), ...(body && { body }) },
      { new: true, runValidators: true }
    );
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });
    res.status(200).json({ success: true, message: 'Draft updated', data: draft });
  } catch (error) {
    console.error('Error updating draft:', error);
    res.status(500).json({ success: false, message: 'Error updating draft', error: error.message });
  }
};

// @desc    Delete draft
// @route   DELETE /api/email-drafts/:id
// @access  Private (Admin)
export const deleteDraft = async (req, res) => {
  try {
    const draft = await EmailDraft.findByIdAndDelete(req.params.id);
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });
    res.status(200).json({ success: true, message: 'Draft deleted' });
  } catch (error) {
    console.error('Error deleting draft:', error);
    res.status(500).json({ success: false, message: 'Error deleting draft', error: error.message });
  }
};

// @desc    Send draft to subscribers
// @route   POST /api/email-drafts/:id/send
// @access  Private (Admin)
export const sendDraftToSubscribers = async (req, res) => {
  try {
    const { subscriberIds } = req.body; // optional — if empty, send to all active

    const draft = await EmailDraft.findById(req.params.id);
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });

    let subscribers;
    if (subscriberIds && subscriberIds.length > 0) {
      subscribers = await Subscriber.find({ _id: { $in: subscriberIds }, status: 'active' });
    } else {
      subscribers = await Subscriber.find({ status: 'active' });
    }

    if (subscribers.length === 0) {
      return res.status(400).json({ success: false, message: 'No active subscribers found' });
    }

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
        <div style="text-align:center;margin-bottom:30px;">
          <h1 style="color:#E82335;font-size:28px;margin:0;">Foodzippy</h1>
        </div>
        <h2 style="color:#333;font-size:22px;">${draft.subject}</h2>
        <div style="color:#555;font-size:16px;line-height:1.6;">
          ${draft.body.replace(/\n/g, '<br/>')}
        </div>
        <hr style="border:none;border-top:1px solid #eee;margin:30px 0;" />
        <p style="color:#999;font-size:12px;text-align:center;">
          &copy; ${new Date().getFullYear()} Foodzippy. All Rights Reserved.
        </p>
      </div>
    `;

    let sent = 0;
    let failed = 0;

    // Send in batches of 5 to avoid overwhelming SMTP
    for (let i = 0; i < subscribers.length; i += 5) {
      const batch = subscribers.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map((sub) =>
          sendEmail({ to: sub.email, subject: draft.subject, html: htmlBody })
        )
      );
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value) sent++;
        else failed++;
      });
    }

    // Update draft metadata
    draft.lastSentAt = new Date();
    draft.recipientCount = sent;
    await draft.save();

    res.status(200).json({
      success: true,
      message: `Email sent to ${sent} subscriber(s)${failed > 0 ? `, ${failed} failed` : ''}`,
      data: { sent, failed, total: subscribers.length },
    });
  } catch (error) {
    console.error('Error sending draft:', error);
    res.status(500).json({ success: false, message: 'Error sending email', error: error.message });
  }
};
