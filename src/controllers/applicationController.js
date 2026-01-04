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

    // 1. Parse stringified JSON from form-data (Multer sends these as strings)
    const applicant = typeof req.body.applicant === 'string' 
      ? JSON.parse(req.body.applicant) 
      : req.body.applicant;

    let answers = typeof req.body.answers === 'string' 
      ? JSON.parse(req.body.answers) 
      : req.body.answers;

    // 2. Job Visibility & Duplicate Checks
    const job = await Job.findById(jobId);
    if (!job || !job.checkVisibility()) {
      return errorResponse(res, 403, 'This job is no longer accepting applications');
    }

    const existing = await Application.findOne({ jobId, 'applicant.email': applicant.email });
    if (existing) {
      return errorResponse(res, 400, 'You have already applied for this job.');
    }

    // 3. Insert the MinIO URL into the correct answer field
    if (req.file && req.file.minioUrl) {
      // The frontend must send 'fileFieldId' so we know which question the CV belongs to
      const fileFieldId = req.body.fileFieldId; 
      
      answers = answers.map(ans => 
        ans.fieldId === fileFieldId ? { ...ans, value: req.file.minioUrl } : ans
      );
    }

    // 4. Save the application
    const application = await Application.create({
      jobId,
      applicant,
      answers,
      cvUrl: req.file ? req.file.minioUrl : null 
    });

    // 5. Send confirmation email (Phase 2)
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
 * STEP 8: Fetch Responses for a Job (Admin)
 * GET /admin/jobs/:jobId/responses
 */
exports.getJobResponses = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const responses = await Application.find({ jobId })
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

    return successResponse(res, 200, 'Responses retrieved successfully', formattedResponses);

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
    
    // Maps the stored MinIO URL back to the question for the Admin to see
    const answers = response.answers.map(answer => {
      // Use .id if checking against a Mongoose subdoc ID string
      const field = jobFields?.fields.find(f => f.id === answer.fieldId);
      return {
        question: field ? field.question : 'Unknown Question',
        type: field ? field.type : 'unknown',
        value: answer.value // This will be the clickable MinIO link for file types
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

    return successResponse(res, 200, 'Response save status updated');

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
    const meetLink = await createGoogleMeetEvent({
      summary: `Interview for ${response.jobId.title}`,
      description: `Interview with ${response.applicant.name}`,
      attendees: [response.applicant.email],
      date: interviewDate,
      time: interviewTime
    });

    response.isInvited = true;
    response.interviewDetails = {
      date: new Date(interviewDate),
      time: interviewTime,
      meetLink
    };
    await response.save();

    // PHASE 2: Send interview email
    const { sendInterviewInvitation } = require('../services/emailService');
    await sendInterviewInvitation(
      response.applicant.email,
      response.applicant.name,
      response.jobId.title,
      interviewDate,
      interviewTime,
      meetLink
    );

    return successResponse(res, 200, 'Interview invitation sent successfully');

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

    response.isAccepted = true;
    await response.save();

    // PHASE 2: Send acceptance email
    const { sendAcceptanceEmail } = require('../services/emailService');
    await sendAcceptanceEmail(
      response.applicant.email,
      response.applicant.name,
      response.jobId.title
    );

    return successResponse(res, 200, 'Acceptance Email sent successfully');

  } catch (error) {
    console.error('Acceptance email error:', error);
    next(error);
  }
};