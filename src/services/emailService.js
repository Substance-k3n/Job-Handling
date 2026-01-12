const nodemailer = require('nodemailer');

/**
 * Check if email is configured
 */
const isEmailConfigured = () => {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
};

/**
 * Create transporter only if email is configured
 */
let transporter = null;

if (isEmailConfigured()) {
  transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  console.log('✅ Email service configured');
} else {
  console.log('⚠️  Email service not configured (optional for Phase 1)');
}

/**
 * Send application confirmation email
 */
exports.sendApplicationConfirmation = async (toEmail, applicantName, jobTitle) => {
  if (!isEmailConfigured()) {
    console.log('📧 [SKIPPED] Application confirmation email (email not configured)');
    return { skipped: true, reason: 'Email not configured' };
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: `Application Received - ${jobTitle}`,
      html: `
        <h2>Application Confirmation</h2>
        <p>Dear ${applicantName},</p>
        <p>Thank you for applying for the position of <strong>${jobTitle}</strong>.</p>
        <p>We have received your application and will review it shortly.</p>
        <br>
        <p>Best regards,<br>Hiring Team</p>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Application confirmation email sent to:', toEmail);
    return result;
  } catch (error) {
    console.error('❌ Failed to send application confirmation email:', error.message);
    throw error;
  }
};

/**
 * Send interview invitation email - NEW TEMPLATE
 * No longer generates Google Meet link automatically
 */
exports.sendInterviewInvitation = async (
  toEmail, 
  applicantName, 
  role,
  interviewDate, 
  interviewTime, 
  interviewLocation,
  customMessage,
  senderName,
  senderTitle
) => {
  if (!isEmailConfigured()) {
    console.log('📧 [SKIPPED] Interview invitation email (email not configured)');
    return { skipped: true, reason: 'Email not configured' };
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: `Interview Invitation for ${role}`,
      html: `
        <h2>Interview Invitation for ${role}</h2>
        <p>Hi ${applicantName},</p>
        <p>Thank you for applying for the <strong>${role}</strong> position at FaydaTech. We'd like to invite you for an interview.</p>
        <br>
        <p><strong>Date:</strong> ${interviewDate}</p>
        <p><strong>Time:</strong> ${interviewTime}</p>
        <p><strong>Location/Link:</strong> ${interviewLocation}</p>
        <br>
        ${customMessage ? `<p>${customMessage}</p><br>` : ''}
        <p>Please confirm your availability by replying to this email.</p>
        <br>
        <p>Best regards,<br>${senderName}<br>${senderTitle}</p>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Interview invitation email sent to:', toEmail);
    return result;
  } catch (error) {
    console.error('❌ Failed to send interview invitation email:', error.message);
    throw error;
  }
};

/**
 * Send acceptance email - NEW FORMAT
 */
exports.sendAcceptanceEmail = async (
  toEmail, 
  applicantName, 
  role,
  customMessage,
  senderName,
  senderTitle
) => {
  if (!isEmailConfigured()) {
    console.log('📧 [SKIPPED] Acceptance email (email not configured)');
    return { skipped: true, reason: 'Email not configured' };
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: `Congratulations! - ${role} Position at FaydaTech`,
      html: `
        <h2>Congratulations!</h2>
        <p>Hi ${applicantName},</p>
        <p>Congratulations, We are delighted to offer you the position of <strong>${role}</strong> at FaydaTech.</p>
        <br>
        ${customMessage ? `<p>${customMessage}</p><br>` : ''}
        <p>We're excited to have you on board and look forward to working with you!</p>
        <br>
        <p>Best regards,<br>${senderName}<br>${senderTitle}</p>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Acceptance email sent to:', toEmail);
    return result;
  } catch (error) {
    console.error('❌ Failed to send acceptance email:', error.message);
    throw error;
  }
};