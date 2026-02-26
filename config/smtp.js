import nodemailer from 'nodemailer';

let transporter = null;

export const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('SMTP not configured — email sending disabled');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
};

export const sendEmail = async ({ to, subject, html }) => {
  const t = getTransporter();
  if (!t) {
    console.warn('SMTP not configured, skipping email to:', to);
    return false;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  try {
    await t.sendMail({ from, to, subject, html });
    return true;
  } catch (err) {
    console.error('SMTP send error:', err.message);
    return false;
  }
};
