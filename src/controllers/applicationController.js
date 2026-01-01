const Application = require('../models/Application');
const Job = require('../models/Job');
const JobField = require('../models/JobField');
const { successResponse, errorResponse } = require('../utils/responseUtils');

/**
 * STEP 3: User Applies for Job
 * POST /jobs/:jobId/apply
 */
exports.applyForJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { applicant, answers } = req.body;

    // Validate job exists and is visible
    const job = await Job.findById(jobId);
    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    if (!job.checkVisibility()) {
      return errorResponse(res, 403, 'This job is no longer accepting applications');
    }

    // Validate required applicant fields
    if (!applicant || !applicant.name || !applicant.email || !applicant.phoneNumber || !applicant.country || !applicant.city) {
      return errorResponse(res, 400, 'Name, email, phone number, country, and city are required');
    }

    // Check for duplicate application
    const existing = await Application.findOne({
      jobId,
      'applicant.email': applicant.email
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        code: 'DUPLICATE_APPLICATION',
        message: 'You have already applied for this job.'
      });
    }

    // Validate answers against job fields
    const jobFields = await JobField.findOne({ jobId });
    if (jobFields && jobFields.fields) {
      for (const field of jobFields.fields) {
        if (field.required) {
          const answer = answers.find(a => a.fieldId === field.id);
          if (!answer || !answer.value) {
            return errorResponse(res, 400, `Field "${field.question}" is required`);
          }
        }
      }
    }

    // Create application
    const application = await Application.create({
      jobId,
      applicant: {
        name: applicant.name,
        email: applicant.email,
        phoneNumber: applicant.phoneNumber,
        country: applicant.country,
        city: applicant.city
      },
      answers
    });

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

    // Get job fields to match answers with questions
    const jobFields = await JobField.findOne({ jobId: response.jobId });
    
    const answers = response.answers.map(answer => {
      const field = jobFields?.fields.find(f => f.id === answer.fieldId);
      return {
        question: field ? field.question : 'Unknown',
        type: field ? field.type : 'unknown',
        value: answer.value
      };
    });

    return successResponse(res, 200, 'Response retrieved successfully', {
      applicant: {
        name: response.applicant.name,
        email: response.applicant.email,
        phoneNumber: response.applicant.phoneNumber,
        country: response.applicant.country,
        city: response.applicant.city
      },
      answers,
      isSaved: response.isSaved,
      isInvited: response.isInvited,
      isAccepted: response.isAccepted
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
 * STEP 11: Send Interview Email (Admin) - PLACEHOLDER
 * POST /admin/responses/:responseId/send-invitation
 */
exports.sendInterviewInvitation = async (req, res, next) => {
  try {
    const { responseId } = req.params;
    const { interviewDate, interviewTime } = req.body;

    const response = await Application.findById(responseId);
    if (!response) {
      return errorResponse(res, 404, 'Response not found');
    }

    // TODO: Phase 2 - Integrate Google Calendar & Send Email
    // For now, just mark as invited
    response.isInvited = true;
    response.interviewDetails = {
      date: new Date(interviewDate),
      time: interviewTime,
      meetLink: 'https://meet.google.com/placeholder' // TODO: Generate real link
    };
    await response.save();

    return successResponse(res, 200, 'Interview invitation sent successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * STEP 12: Send Acceptance Email (Admin) - PLACEHOLDER
 * POST /admin/responses/:responseId/send-acceptance
 */
exports.sendAcceptanceEmail = async (req, res, next) => {
  try {
    const { responseId } = req.params;

    const response = await Application.findById(responseId);
    if (!response) {
      return errorResponse(res, 404, 'Response not found');
    }

    // TODO: Phase 2 - Send Email
    // For now, just mark as accepted
    response.isAccepted = true;
    await response.save();

    return successResponse(res, 200, 'Acceptance Email sent successfully');

  } catch (error) {
    next(error);
  }
};