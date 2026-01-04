const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Send application confirmation email
 */
exports.sendApplicationConfirmation = async (toEmail, applicantName, jobTitle) => {
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

  return await transporter.sendMail(mailOptions);
};

/**
 * Send interview invitation email
 */
exports.sendInterviewInvitation = async (toEmail, applicantName, jobTitle, date, time, meetLink) => {
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

  return await transporter.sendMail(mailOptions);
};

/**
 * Send acceptance email
 */
exports.sendAcceptanceEmail = async (toEmail, applicantName, jobTitle) => {
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

  return await transporter.sendMail(mailOptions);
};