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
 * Send interview invitation email
 */
exports.sendInterviewInvitation = async (toEmail, applicantName, jobTitle, date, time, meetLink) => {
  if (!isEmailConfigured()) {
    console.log('📧 [SKIPPED] Interview invitation email (email not configured)');
    return { skipped: true, reason: 'Email not configured' };
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: `Interview Invitation - ${jobTitle}`,
      html: `
        <h2>Interview Invitation</h2>
        <p>Dear ${applicantName},</p>
        <p>We are pleased to invite you for an interview for the position of <strong>${jobTitle}</strong>.</p>
        <br>
        <p><strong>Interview Details:</strong></p>
        <ul>
          <li>Date: ${date}</li>
          <li>Time: ${time}</li>
          <li>Meeting Link: <a href="${meetLink}">${meetLink}</a></li>
        </ul>
        <br>
        <p>Please join the meeting at the scheduled time.</p>
        <br>
        <p>Best regards,<br>Hiring Team</p>
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
 * Send acceptance email
 */
exports.sendAcceptanceEmail = async (toEmail, applicantName, jobTitle) => {
  if (!isEmailConfigured()) {
    console.log('📧 [SKIPPED] Acceptance email (email not configured)');
    return { skipped: true, reason: 'Email not configured' };
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: `Congratulations! - ${jobTitle}`,
      html: `
        <h2>Congratulations!</h2>
        <p>Dear ${applicantName},</p>
        <p>We are delighted to inform you that you have been selected for the position of <strong>${jobTitle}</strong>.</p>
        <p>We will contact you shortly with further details.</p>
        <br>
        <p>Welcome to the team!</p>
        <br>
        <p>Best regards,<br>Hiring Team</p>
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