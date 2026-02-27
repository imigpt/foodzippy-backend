import nodemailer from 'nodemailer';

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('SMTP not configured — email sending disabled');
    return null;
  }

  // Gmail uses oauth/app-password with specific settings
  const isGmail = host.includes('gmail') || host.includes('google');

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: !isGmail && port === 587,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
};

export const sendEmail = async ({ to, subject, html }) => {
  const t = createTransporter();
  if (!t) {
    console.warn('SMTP not configured, skipping email to:', to);
    return { success: false, error: 'SMTP not configured' };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  try {
    const info = await t.sendMail({ from, to, subject, html });
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`SMTP send error to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};


export const sendEmail = async ({ to, subject, html }) => {
  const t = createTransporter();
  if (!t) {
    console.warn('SMTP not configured, skipping email to:', to);
    return { success: false, error: 'SMTP not configured' };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  try {
    const info = await t.sendMail({ from, to, subject, html });
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`SMTP send error to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};
