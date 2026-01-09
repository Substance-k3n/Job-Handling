const Application = require('../models/Application');
const Job = require('../models/Job');
const JobField = require('../models/JobField');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const { sendApplicationConfirmation } = require('../services/emailService');
const { createGoogleMeetEvent } = require('../services/googleCalendarService');

/**
 * STEP 3: User Applies for Job
 * POST /jobs/:jobId/apply
 */
exports.applyForJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    // Parse stringified JSON from form-data
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

    // Insert MinIO URL into the correct answer field
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
      // Don't fail the application if email fails
    }

    return successResponse(res, 201, 'Application submitted successfully', {
      applicationId: application._id,
      cvUrl: application.cvUrl
    });

  } catch (error) {
    next(error);
  }
};

/**
 * STEP 8: Fetch Responses for a Job (Admin) - WITH FILTERING
 * GET /admin/jobs/:jobId/responses
 * Query params: ?isSaved=true&isInvited=false&isAccepted=true
 */
exports.getJobResponses = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    // Build filter object based on query parameters
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
 * STEP 11: Send Interview Email (Admin) - PHASE 2
 * POST /admin/responses/:responseId/send-invitation
 */
exports.sendInterviewInvitation = async (req, res, next) => {
  try {
    const { responseId } = req.params;
    const { interviewDate, interviewTime } = req.body;

    const response = await Application.findById(responseId).populate('jobId', 'title');
    if (!response) {
      return errorResponse(res, 404, 'Response not found');
    }

    // PHASE 2: Create Google Calendar event & get Meet link
    let meetLink = 'https://meet.google.com/placeholder';
    try {
      meetLink = await createGoogleMeetEvent({
        summary: `Interview for ${response.jobId.title}`,
        description: `Interview with ${response.applicant.name}`,
        attendees: [response.applicant.email],
        date: interviewDate,
        time: interviewTime
      });
    } catch (calendarError) {
      console.error('Google Calendar error:', calendarError.message);
      // Continue even if calendar fails
    }

    // Update application
    response.isInvited = true;
    response.interviewDetails = {
      date: new Date(interviewDate),
      time: interviewTime,
      meetLink
    };
    await response.save();

    // PHASE 2: Send interview email
    try {
      const { sendInterviewInvitation } = require('../services/emailService');
      await sendInterviewInvitation(
        response.applicant.email,
        response.applicant.name,
        response.jobId.title,
        interviewDate,
        interviewTime,
        meetLink
      );
    } catch (emailError) {
      console.error('Email error:', emailError.message);
      // Don't fail if email fails
    }

    return successResponse(res, 200, 'Interview invitation sent successfully', {
      responseId: response._id,
      isInvited: response.isInvited,
      interviewDetails: response.interviewDetails
    });

  } catch (error) {
    console.error('Interview invitation error:', error);
    next(error);
  }
};

/**
 * STEP 12: Send Acceptance Email (Admin) - PHASE 2
 * POST /admin/responses/:responseId/send-acceptance
 */
exports.sendAcceptanceEmail = async (req, res, next) => {
  try {
    const { responseId } = req.params;

    const response = await Application.findById(responseId).populate('jobId', 'title');
    if (!response) {
      return errorResponse(res, 404, 'Response not found');
    }

    // Update application
    response.isAccepted = true;
    await response.save();

    // PHASE 2: Send acceptance email
    try {
      const { sendAcceptanceEmail } = require('../services/emailService');
      await sendAcceptanceEmail(
        response.applicant.email,
        response.applicant.name,
        response.jobId.title
      );
    } catch (emailError) {
      console.error('Email error:', emailError.message);
      // Don't fail if email fails
    }

    return successResponse(res, 200, 'Acceptance Email sent successfully', {
      responseId: response._id,
      isAccepted: response.isAccepted
    });

  } catch (error) {
    console.error('Acceptance email error:', error);
    next(error);
  }
};