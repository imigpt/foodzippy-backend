/**
 * Reusable branded email templates for FoodZippy
 * All emails share a consistent look & feel.
 */

const BRAND_COLOR = '#E82335';
const BRAND_NAME = 'Foodzippy';
const YEAR = new Date().getFullYear();

// ─── Base wrapper ────────────────────────────────────────────────────
const wrap = (body) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#fff;">
    <div style="text-align:center;margin-bottom:30px;">
      <h1 style="color:${BRAND_COLOR};font-size:28px;margin:0;">${BRAND_NAME}</h1>
    </div>
    <div style="color:#333;font-size:16px;line-height:1.6;">
      ${body}
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:30px 0;" />
    <p style="color:#999;font-size:12px;text-align:center;">
      &copy; ${YEAR} ${BRAND_NAME}. All Rights Reserved.
    </p>
  </div>
`;

// ─── Career Application ──────────────────────────────────────────────

export const careerApplicationReceived = ({ fullName, position, city }) => ({
  subject: 'Career Application Received – Foodzippy',
  html: wrap(`
    <h2 style="color:#333;font-size:22px;">Application Received</h2>
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>Thank you for applying for the <strong>${position}</strong> position in <strong>${city}</strong>.</p>
    <p>We have received your application and our team will review it shortly. If your profile matches our requirements, we will reach out to you.</p>
    <p style="margin-top:20px;">Best regards,<br/><strong>Foodzippy Careers Team</strong></p>
  `),
});

export const careerStatusUpdate = ({ fullName, position, status }) => {
  const statusMessages = {
    shortlisted: 'Congratulations! Your application has been <strong style="color:#16a34a;">shortlisted</strong>. We will contact you soon to discuss the next steps.',
    hired: '🎉 Congratulations! You have been <strong style="color:#16a34a;">hired</strong>! Our team will get in touch with you regarding the onboarding process.',
    rejected: 'After careful consideration, we regret to inform you that your application has been <strong style="color:#dc2626;">not selected</strong> at this time. We encourage you to apply again in the future.',
    reviewed: 'Your application is currently being <strong>reviewed</strong> by our team. We will update you once a decision is made.',
  };

  const message = statusMessages[status] || `Your application status has been updated to: <strong>${status}</strong>.`;

  return {
    subject: `Career Application Update – ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    html: wrap(`
      <h2 style="color:#333;font-size:22px;">Application Status Update</h2>
      <p>Dear <strong>${fullName}</strong>,</p>
      <p>Regarding your application for the <strong>${position}</strong> position:</p>
      <p>${message}</p>
      <p style="margin-top:20px;">Best regards,<br/><strong>Foodzippy Careers Team</strong></p>
    `),
  };
};

// ─── Franchise Inquiry ───────────────────────────────────────────────

export const franchiseInquiryReceived = ({ name }) => ({
  subject: 'Franchise Inquiry Received – Foodzippy',
  html: wrap(`
    <h2 style="color:#333;font-size:22px;">Inquiry Received</h2>
    <p>Dear <strong>${name}</strong>,</p>
    <p>Thank you for your interest in the Foodzippy franchise opportunity!</p>
    <p>We have received your inquiry and our franchise team will review your details. A representative will get in touch with you shortly.</p>
    <p style="margin-top:20px;">Best regards,<br/><strong>Foodzippy Franchise Team</strong></p>
  `),
});

export const franchiseStatusUpdate = ({ name, status }) => {
  const statusMessages = {
    contacted: 'Our franchise team has reviewed your inquiry and will be reaching out to you shortly to discuss further details.',
    approved: '🎉 Congratulations! Your franchise inquiry has been <strong style="color:#16a34a;">approved</strong>. Our team will contact you with the next steps.',
    rejected: 'After careful evaluation, we are unable to proceed with your franchise inquiry at this time. Thank you for your interest.',
  };

  const message = statusMessages[status] || `Your inquiry status has been updated to: <strong>${status}</strong>.`;

  return {
    subject: `Franchise Inquiry Update – Foodzippy`,
    html: wrap(`
      <h2 style="color:#333;font-size:22px;">Inquiry Status Update</h2>
      <p>Dear <strong>${name}</strong>,</p>
      <p>${message}</p>
      <p style="margin-top:20px;">Best regards,<br/><strong>Foodzippy Franchise Team</strong></p>
    `),
  };
};

// ─── Investor Inquiry ────────────────────────────────────────────────

export const investorInquiryReceived = ({ name }) => ({
  subject: 'Investor Inquiry Received – Foodzippy',
  html: wrap(`
    <h2 style="color:#333;font-size:22px;">Inquiry Received</h2>
    <p>Dear <strong>${name}</strong>,</p>
    <p>Thank you for your interest in investing with Foodzippy!</p>
    <p>We have received your inquiry and our investment team will review your details. A representative will be in touch with you soon.</p>
    <p style="margin-top:20px;">Best regards,<br/><strong>Foodzippy Investment Team</strong></p>
  `),
});

export const investorStatusUpdate = ({ name, status }) => {
  const statusMessages = {
    contacted: 'Our investment team has reviewed your inquiry and will be reaching out to you shortly.',
    approved: '🎉 Congratulations! Your investor inquiry has been <strong style="color:#16a34a;">approved</strong>. Our team will contact you with the next steps.',
    rejected: 'After careful evaluation, we are unable to proceed with your investor inquiry at this time. Thank you for your interest.',
  };

  const message = statusMessages[status] || `Your inquiry status has been updated to: <strong>${status}</strong>.`;

  return {
    subject: `Investor Inquiry Update – Foodzippy`,
    html: wrap(`
      <h2 style="color:#333;font-size:22px;">Inquiry Status Update</h2>
      <p>Dear <strong>${name}</strong>,</p>
      <p>${message}</p>
      <p style="margin-top:20px;">Best regards,<br/><strong>Foodzippy Investment Team</strong></p>
    `),
  };
};

// ─── Delivery Partner ────────────────────────────────────────────────

export const deliveryPartnerApplicationReceived = ({ fullName }) => ({
  subject: 'Delivery Partner Application Received – Foodzippy',
  html: wrap(`
    <h2 style="color:#333;font-size:22px;">Application Received</h2>
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>Thank you for applying to become a Foodzippy Delivery Partner!</p>
    <p>We have received your application and our team will review it. You will be notified once a decision is made.</p>
    <p style="margin-top:20px;">Best regards,<br/><strong>Foodzippy Delivery Team</strong></p>
  `),
});

export const deliveryPartnerRejected = ({ fullName, reason }) => ({
  subject: 'Delivery Partner Application Update – Foodzippy',
  html: wrap(`
    <h2 style="color:#333;font-size:22px;">Application Update</h2>
    <p>Dear <strong>${fullName}</strong>,</p>
    <p>After reviewing your application, we regret to inform you that we are unable to proceed at this time.</p>
    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
    <p>We encourage you to apply again in the future.</p>
    <p style="margin-top:20px;">Best regards,<br/><strong>Foodzippy Delivery Team</strong></p>
  `),
});

// ─── User / Agent Welcome ────────────────────────────────────────────

export const userWelcomeEmail = ({ name, username, password, role }) => ({
  subject: `Welcome to Foodzippy – Your ${role.charAt(0).toUpperCase() + role.slice(1)} Account`,
  html: wrap(`
    <h2 style="color:#333;font-size:22px;">Welcome to Foodzippy!</h2>
    <p>Dear <strong>${name}</strong>,</p>
    <p>Your <strong>${role}</strong> account has been created. Here are your login credentials:</p>
    <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="margin:5px 0;"><strong>Username:</strong> ${username}</p>
      <p style="margin:5px 0;"><strong>Password:</strong> ${password}</p>
    </div>
    <p style="color:#dc2626;font-size:14px;">⚠️ Please keep these credentials secure and do not share them with anyone.</p>
    <p style="margin-top:20px;">Best regards,<br/><strong>Foodzippy Admin Team</strong></p>
  `),
});

// ─── Admin Notification (new submissions) ────────────────────────────

export const adminNewSubmissionNotice = ({ type, name, email, details }) => ({
  subject: `New ${type} Submission – Foodzippy`,
  html: wrap(`
    <h2 style="color:#333;font-size:22px;">New ${type} Submission</h2>
    <p>A new ${type.toLowerCase()} has been submitted:</p>
    <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="margin:5px 0;"><strong>Name:</strong> ${name}</p>
      <p style="margin:5px 0;"><strong>Email:</strong> ${email}</p>
      ${details ? `<p style="margin:5px 0;"><strong>Details:</strong> ${details}</p>` : ''}
    </div>
    <p>Please log in to the admin panel to review this submission.</p>
  `),
});
