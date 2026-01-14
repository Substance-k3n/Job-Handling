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
  transporter = nodemailer.createTransport({
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
      from: `"FaydaTech Careers" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Application Received - ${jobTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 20px;
              text-align: center;
            }
            .header h1 {
              color: #ffffff;
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              padding: 40px 30px;
              color: #333333;
              line-height: 1.6;
            }
            .content h2 {
              color: #667eea;
              font-size: 24px;
              margin-top: 0;
            }
            .content p {
              font-size: 16px;
              margin: 15px 0;
            }
            .info-box {
              background-color: #f8f9fa;
              border-left: 4px solid #667eea;
              padding: 20px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .info-box strong {
              color: #667eea;
              display: block;
              margin-bottom: 8px;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-box p {
              margin: 0;
              font-size: 18px;
              color: #333;
              font-weight: 500;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 30px;
              text-align: center;
              color: #666666;
              font-size: 14px;
              border-top: 1px solid #e0e0e0;
            }
            .footer p {
              margin: 5px 0;
            }
            .divider {
              height: 1px;
              background-color: #e0e0e0;
              margin: 30px 0;
            }
            .emoji {
              font-size: 24px;
              margin-right: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 Application Confirmation</h1>
            </div>
            
            <div class="content">
              <h2>Dear ${applicantName},</h2>
              
              <p>Thank you for applying for the position of <strong>${jobTitle}</strong> at FaydaTech.</p>
              
              <div class="info-box">
                <strong>✅ Your Application Status</strong>
                <p>Successfully Received</p>
              </div>
              
              <p>We have received your application and our hiring team will review it carefully. If your qualifications match our requirements, we will contact you within the next 5-7 business days.</p>
              
              <div class="divider"></div>
              
              <p><strong>What happens next?</strong></p>
              <ul style="padding-left: 20px;">
                <li style="margin: 10px 0;">Our team reviews your application</li>
                <li style="margin: 10px 0;">Qualified candidates will be contacted for an interview</li>
                <li style="margin: 10px 0;">You'll receive an email with interview details</li>
              </ul>
              
              <div class="divider"></div>
              
              <p>We appreciate your interest in joining our team and wish you the best of luck!</p>
              
              <p style="margin-top: 30px;">
                <strong>Best regards,</strong><br>
                FaydaTech Hiring Team
              </p>
            </div>
            
            <div class="footer">
              <p><strong>FaydaTech</strong></p>
              <p>Building the future, one hire at a time.</p>
              <p style="margin-top: 20px; color: #999; font-size: 12px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
        </html>
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
 * Send interview invitation email - PROFESSIONAL HTML TEMPLATE
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
      from: `"${senderName} - FaydaTech" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Interview Invitation for ${role}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
              padding: 40px 20px;
              text-align: center;
            }
            .header h1 {
              color: #ffffff;
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              padding: 40px 30px;
              color: #333333;
              line-height: 1.6;
            }
            .content h2 {
              color: #11998e;
              font-size: 24px;
              margin-top: 0;
            }
            .content p {
              font-size: 16px;
              margin: 15px 0;
            }
            .interview-details {
              background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
              border: 2px solid #11998e;
              border-radius: 8px;
              padding: 25px;
              margin: 30px 0;
            }
            .interview-details h3 {
              color: #11998e;
              margin-top: 0;
              margin-bottom: 20px;
              font-size: 20px;
            }
            .detail-row {
              display: flex;
              margin: 15px 0;
              align-items: center;
            }
            .detail-icon {
              font-size: 24px;
              margin-right: 15px;
              min-width: 30px;
            }
            .detail-content strong {
              color: #666;
              display: block;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 5px;
            }
            .detail-content p {
              margin: 0;
              font-size: 16px;
              color: #333;
              font-weight: 500;
            }
            .custom-message {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 20px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .custom-message p {
              margin: 0;
              color: #856404;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
              color: #ffffff !important;
              text-decoration: none;
              padding: 15px 40px;
              border-radius: 50px;
              font-weight: 600;
              font-size: 16px;
              margin: 25px 0;
              box-shadow: 0 4px 15px rgba(17, 153, 142, 0.3);
            }
            .footer {
              background-color: #f8f9fa;
              padding: 30px;
              text-align: center;
              color: #666666;
              font-size: 14px;
              border-top: 1px solid #e0e0e0;
            }
            .footer p {
              margin: 5px 0;
            }
            .signature {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
            }
            .signature p {
              margin: 5px 0;
            }
            .divider {
              height: 1px;
              background-color: #e0e0e0;
              margin: 30px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Interview Invitation</h1>
            </div>
            
            <div class="content">
              <h2>Hi ${applicantName},</h2>
              
              <p>Thank you for applying for the <strong>${role}</strong> position at FaydaTech. We'd like to invite you for an interview!</p>
              
              <p>We were impressed by your application and would love to learn more about your experience and how you might contribute to our team.</p>
              
              <div class="interview-details">
                <h3>📅 Interview Details</h3>
                
                <div class="detail-row">
                  <div class="detail-icon">📆</div>
                  <div class="detail-content">
                    <strong>Date</strong>
                    <p>${interviewDate}</p>
                  </div>
                </div>
                
                <div class="detail-row">
                  <div class="detail-icon">🕐</div>
                  <div class="detail-content">
                    <strong>Time</strong>
                    <p>${interviewTime}</p>
                  </div>
                </div>
                
                <div class="detail-row">
                  <div class="detail-icon">📍</div>
                  <div class="detail-content">
                    <strong>Location / Link</strong>
                    <p>${interviewLocation}</p>
                  </div>
                </div>
              </div>
              
              ${customMessage ? `
                <div class="custom-message">
                  <p><strong>📌 Important Note:</strong></p>
                  <p style="margin-top: 10px;">${customMessage}</p>
                </div>
              ` : ''}
              
              <div class="divider"></div>
              
              <p><strong>Please confirm your availability</strong> by replying to this email at your earliest convenience.</p>
              
              <p>If you have any questions or need to reschedule, please don't hesitate to reach out.</p>
              
              <p>We look forward to speaking with you!</p>
              
              <div class="signature">
                <p><strong>Best regards,</strong></p>
                <p><strong>${senderName}</strong></p>
                <p style="color: #666;">${senderTitle}</p>
                <p style="color: #666;">FaydaTech</p>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>FaydaTech</strong></p>
              <p>Building the future, one hire at a time.</p>
              <p style="margin-top: 20px; color: #999; font-size: 12px;">
                Please reply to this email to confirm your attendance.
              </p>
            </div>
          </div>
        </body>
        </html>
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
 * Send acceptance email - PROFESSIONAL HTML TEMPLATE
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
      from: `"${senderName} - FaydaTech" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `🎉 Congratulations! - ${role} Position at FaydaTech`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              padding: 50px 20px;
              text-align: center;
            }
            .header h1 {
              color: #ffffff;
              margin: 0;
              font-size: 32px;
              font-weight: 700;
            }
            .celebration {
              font-size: 60px;
              margin-bottom: 15px;
            }
            .content {
              padding: 40px 30px;
              color: #333333;
              line-height: 1.6;
            }
            .content h2 {
              color: #f5576c;
              font-size: 24px;
              margin-top: 0;
            }
            .content p {
              font-size: 16px;
              margin: 15px 0;
            }
            .highlight-box {
              background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
              border: 2px solid #f5576c;
              border-radius: 8px;
              padding: 30px;
              margin: 30px 0;
              text-align: center;
            }
            .highlight-box h3 {
              color: #f5576c;
              margin: 0 0 10px 0;
              font-size: 22px;
            }
            .highlight-box p {
              margin: 0;
              font-size: 18px;
              color: #333;
              font-weight: 500;
            }
            .offer-details {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 20px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .offer-details p {
              margin: 0;
              color: #856404;
            }
            .welcome-message {
              background-color: #d4edda;
              border-left: 4px solid #28a745;
              padding: 20px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .welcome-message p {
              margin: 0;
              color: #155724;
              font-weight: 500;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 30px;
              text-align: center;
              color: #666666;
              font-size: 14px;
              border-top: 1px solid #e0e0e0;
            }
            .footer p {
              margin: 5px 0;
            }
            .signature {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
            }
            .signature p {
              margin: 5px 0;
            }
            .divider {
              height: 1px;
              background-color: #e0e0e0;
              margin: 30px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="celebration">🎉🎊🎈</div>
              <h1>Congratulations!</h1>
            </div>
            
            <div class="content">
              <h2>Hi ${applicantName},</h2>
              
              <p>We are <strong>delighted</strong> to offer you the position of <strong>${role}</strong> at FaydaTech!</p>
              
              <div class="highlight-box">
                <h3>🌟 Welcome to the Team!</h3>
                <p>You've been selected as our new ${role}</p>
              </div>
              
              <p>After careful consideration of all candidates, we believe you are the perfect fit for our team. Your skills, experience, and passion impressed us throughout the interview process.</p>
              
              ${customMessage ? `
                <div class="offer-details">
                  <p><strong>📋 Next Steps:</strong></p>
                  <p style="margin-top: 10px;">${customMessage}</p>
                </div>
              ` : ''}
              
              <div class="welcome-message">
                <p>✨ We're excited to have you on board and look forward to working with you!</p>
              </div>
              
              <div class="divider"></div>
              
              <p><strong>What happens next?</strong></p>
              <ul style="padding-left: 20px;">
                <li style="margin: 10px 0;">Review and sign the offer letter</li>
                <li style="margin: 10px 0;">Complete any required onboarding documents</li>
                <li style="margin: 10px 0;">We'll schedule your start date and orientation</li>
              </ul>
              
              <div class="divider"></div>
              
              <p>If you have any questions or need clarification on anything, please don't hesitate to reach out. We're here to help make your transition as smooth as possible.</p>
              
              <p>Once again, congratulations and welcome to FaydaTech! 🎉</p>
              
              <div class="signature">
                <p><strong>Best regards,</strong></p>
                <p><strong>${senderName}</strong></p>
                <p style="color: #666;">${senderTitle}</p>
                <p style="color: #666;">FaydaTech</p>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>FaydaTech</strong></p>
              <p>Building the future, one hire at a time.</p>
              <p style="margin-top: 20px; color: #999; font-size: 12px;">
                Please reply to this email if you have any questions.
              </p>
            </div>
          </div>
        </body>
        </html>
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