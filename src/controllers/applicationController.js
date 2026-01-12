const Application = require('../models/Application');
const Job = require('../models/Job');
const JobField = require('../models/JobField');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const { sendApplicationConfirmation, sendInterviewInvitation, sendAcceptanceEmail } = require('../services/emailService');

/**
 * STEP 3: User Applies for Job - WITH VALIDATION
 * POST /jobs/:jobId/apply
 */
exports.applyForJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    // Parse applicant and answers from form-data
    const applicant = typeof req.body.applicant === 'string' 
      ? JSON.parse(req.body.applicant) 
      : req.body.applicant;

    let answers = typeof req.body.answers === 'string' 
      ? JSON.parse(req.body.answers) 
      : req.body.answers;

    // Validate required applicant fields
    if (!applicant?.name || !applicant?.email || !applicant?.phoneNumber || 
        !applicant?.country || !applicant?.city) {
      return errorResponse(res, 400, 'Name, email, phone number, country, and city are required');
    }

    // Job Visibility & Duplicate Checks
    const job = await Job.findById(jobId);
    if (!job || !job.checkVisibility()) {
      return errorResponse(res, 403, 'This job is no longer accepting applications');
    }

    const existing = await Application.findOne({ jobId, 'applicant.email': applicant.email });
    if (existing) {
      return errorResponse(res, 400, 'You have already applied for this job.', 'DUPLICATE_APPLICATION');
    }

    // Get job fields for validation
    const jobFields = await JobField.findOne({ jobId });
    if (!jobFields || !jobFields.fields || jobFields.fields.length === 0) {
      return errorResponse(res, 400, 'Job form fields not found');
    }

    // Validate required fields
    const requiredFields = jobFields.fields.filter(f => f.required);
    const missingFields = [];

    for (const reqField of requiredFields) {
      const answer = answers.find(a => a.fieldId === reqField.id);
      
      if (!answer || !answer.value || 
          (Array.isArray(answer.value) && answer.value.length === 0) ||
          (typeof answer.value === 'string' && answer.value.trim() === '')) {
        missingFields.push(reqField.question);
      }
    }

    if (missingFields.length > 0) {
      return errorResponse(
        res, 
        400, 
        `The following required fields are missing: ${missingFields.join(', ')}`
      );
    }

    // Insert MinIO URL for CV if uploaded
    if (req.file && req.file.minioUrl) {
      const fileFieldId = req.body.fileFieldId; 
      answers = answers.map(ans => 
        ans.fieldId === fileFieldId ? { ...ans, value: req.file.minioUrl } : ans
      );
    }

    // Save the application
    const application = await Application.create({
      jobId,
      applicant,
      answers,
      cvUrl: req.file ? req.file.minioUrl : null 
    });

    // Send confirmation email (optional - Phase 2)
    try {
      await sendApplicationConfirmation(applicant.email, applicant.name, job.title);
    } catch (emailError) {
      console.error('Email notification failed:', emailError.message);
    }

    return successResponse(res, 201, 'Application submitted successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * STEP 8: Fetch Responses for a Job (Admin) - WITH FILTERING
 * GET /admin/jobs/:jobId/responses?isSaved=true&isInvited=false&isAccepted=true
 */
exports.getJobResponses = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    // Build filter object
    const filter = { jobId };

    // Add optional filters
    if (req.query.isSaved !== undefined) {
      filter.isSaved = req.query.isSaved === 'true';
    }
    if (req.query.isInvited !== undefined) {
      filter.isInvited = req.query.isInvited === 'true';
    }
    if (req.query.isAccepted !== undefined) {
      filter.isAccepted = req.query.isAccepted === 'true';
    }

    const responses = await Application.find(filter)
      .select('applicant.name applicant.email applicant.phoneNumber isSaved isInvited isAccepted createdAt')
      .sort({ createdAt: -1 });

    const formattedResponses = responses.map(r => ({
      responseId: r._id,
      applicantName: r.applicant.name,
      applicantEmail: r.applicant.email,
      applicantPhoneNumber: r.applicant.phoneNumber,
      submittedAt: r.createdAt,
      isSaved: r.isSaved,
      isInvited: r.isInvited,
      isAccepted: r.isAccepted
    }));

    return successResponse(res, 200, 'Responses retrieved successfully', {
      total: formattedResponses.length,
      filters: {
        isSaved: req.query.isSaved,
        isInvited: req.query.isInvited,
        isAccepted: req.query.isAccepted
      },
      responses: formattedResponses
    });

  } catch (error) {
    next(error);
  }
};

/**
 * STEP 9: Fetch Single Response Detail (Admin)
 * GET /admin/responses/:responseId
 */
exports.getResponseDetail = async (req, res, next) => {
  try {
    const { responseId } = req.params;

    const response = await Application.findById(responseId).populate('jobId', 'title');
    if (!response) {
      return errorResponse(res, 404, 'Response not found');
    }

    const jobFields = await JobField.findOne({ jobId: response.jobId });
    
    // Map answers to questions
    const answers = response.answers.map(answer => {
      const field = jobFields?.fields.find(f => f.id === answer.fieldId);
      return {
        question: field ? field.question : 'Unknown Question',
        type: field ? field.type : 'unknown',
        value: answer.value
      };
    });

    return successResponse(res, 200, 'Response retrieved successfully', {
      applicant: response.applicant,
      answers,
      isSaved: response.isSaved,
      isInvited: response.isInvited,
      isAccepted: response.isAccepted,
      submittedAt: response.createdAt
    });

  } catch (error) {
    next(error);
  }
};

/**
 * STEP 10: Save / Unsave Response (Admin)
 * PATCH /admin/responses/:responseId/save
 */
exports.toggleSaveResponse = async (req, res, next) => {
  try {
    const { responseId } = req.params;
    const { isSaved } = req.body;

    const response = await Application.findById(responseId);
    if (!response) {
      return errorResponse(res, 404, 'Response not found');
    }

    response.isSaved = isSaved;
    await response.save();

    return successResponse(res, 200, 'Response save status updated', {
      responseId: response._id,
      isSaved: response.isSaved
    });

  } catch (error) {
    next(error);
  }
};

/**
 * STEP 11: Send Interview Email (Admin) - NEW FORMAT
 * POST /admin/responses/:responseId/send-invitation
 */
exports.sendInterviewInvitation = async (req, res, next) => {
  try {
    const { responseId } = req.params;
    const { 
      applicant_name,
      role,
      interview_date,
      interview_time,
      interview_location,
      custom_message,
      sender_name,
      sender_title
    } = req.body;

    // Validate required fields
    if (!applicant_name || !role || !interview_date || !interview_time || 
        !interview_location || !sender_name || !sender_title) {
      return errorResponse(res, 400, 'All interview details are required: applicant_name, role, interview_date, interview_time, interview_location, sender_name, sender_title');
    }

    const response = await Application.findById(responseId).populate('jobId', 'title');
    if (!response) {
      return errorResponse(res, 404, 'Response not found');
    }

    // Update application with interview details
    response.isInvited = true;
    response.interviewDetails = {
      date: new Date(interview_date),
      time: interview_time,
      meetLink: interview_location,
      role,
      custom_message: custom_message || '',
      sender_name,
      sender_title
    };
    await response.save();

    // Send interview email with new template
    try {
      await sendInterviewInvitation(
        response.applicant.email,
        applicant_name,
        role,
        interview_date,
        interview_time,
        interview_location,
        custom_message || '',
        sender_name,
        sender_title
      );
    } catch (emailError) {
      console.error('Email error:', emailError.message);
      // Don't fail if email fails
    }

    return successResponse(res, 200, 'Interview invitation sent successfully', {
      responseId: response._id,
      isInvited: response.isInvited,
      interviewDetails: {
        applicant_name,
        role,
        interview_date,
        interview_time,
        interview_location,
        custom_message: custom_message || '',
        sender_name,
        sender_title
      }
    });

  } catch (error) {
    console.error('Interview invitation error:', error);
    next(error);
  }
};

/**
 * STEP 12: Send Acceptance Email (Admin) - NEW FORMAT
 * POST /admin/responses/:responseId/send-acceptance
 */
exports.sendAcceptanceEmail = async (req, res, next) => {
  try {
    const { responseId } = req.params;
    const { 
      applicant_name,
      role,
      custom_message,
      sender_name,
      sender_title
    } = req.body;

    // Validate required fields
    if (!applicant_name || !role || !sender_name || !sender_title) {
      return errorResponse(res, 400, 'All acceptance details are required: applicant_name, role, sender_name, sender_title');
    }

    const response = await Application.findById(responseId).populate('jobId', 'title');
    if (!response) {
      return errorResponse(res, 404, 'Response not found');
    }

    // Update application with acceptance details
    response.isAccepted = true;
    response.acceptanceDetails = {
      role,
      custom_message: custom_message || '',
      sender_name,
      sender_title,
      sentAt: new Date()
    };
    await response.save();

    // Send acceptance email with new template
    try {
      await sendAcceptanceEmail(
        response.applicant.email,
        applicant_name,
        role,
        custom_message || '',
        sender_name,
        sender_title
      );
    } catch (emailError) {
      console.error('Email error:', emailError.message);
      // Don't fail if email fails
    }

    return successResponse(res, 200, 'Acceptance Email sent successfully', {
      responseId: response._id,
      isAccepted: response.isAccepted,
      acceptanceDetails: {
        applicant_name,
        role,
        custom_message: custom_message || '',
        sender_name,
        sender_title
      }
    });

  } catch (error) {
    console.error('Acceptance email error:', error);
    next(error);
  }
};