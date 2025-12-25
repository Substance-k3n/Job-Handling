const Application = require('../models/Application');
const Job = require('../models/Job');
const { successResponse, errorResponse } = require('../utils/responseUtils');

// 1. Apply for a Job (Standard User)
const applyForJob = async (req, res, next) => {
  try {
    const { jobId, coverLetter } = req.body;

    const job = await Job.findById(jobId);
    if (!job) return errorResponse(res, 404, 'Job not found');
    if (job.status !== 'active') return errorResponse(res, 400, 'This job is no longer accepting applications');

    if (!req.file) return errorResponse(res, 400, 'CV file is required');

    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: req.user.id
    });

    if (existingApplication) return errorResponse(res, 400, 'You have already applied for this job');

    const application = await Application.create({
      job: jobId,
      applicant: req.user.id,
      coverLetter,
      cvPath: req.file.path
      // pipeline_stage defaults to 'applied' in model
      // stage_history is automatically populated by our model's pre-save hook
    });

    await application.populate('job', 'title');
    await application.populate('applicant', 'name email');

    return successResponse(res, 201, 'Application submitted successfully', application);
  } catch (error) {
    next(error);
  }
};

// 2. Get logged in user's applications
const getMyApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ applicant: req.user.id })
      .populate('job', 'title company location type')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Applications retrieved successfully', applications);
  } catch (error) {
    next(error);
  }
};

// 3. Get all applications (Admin Only - with Pipeline filtering)
const getAllApplications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, stage, jobId } = req.query;

    const query = {};
    if (stage) query.pipeline_stage = stage; // Changed from status to stage
    if (jobId) query.job = jobId;

    const applications = await Application.find(query)
      .populate('job', 'title company location')
      .populate('applicant', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Application.countDocuments(query);

    return successResponse(res, 200, 'Applications retrieved successfully', {
      applications,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalApplications: count
    });
  } catch (error) {
    next(error);
  }
};

// 4b. Get applications for a specific job (Admin Only)
const getJobApplications = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { page = 1, limit = 10, stage } = req.query;

    const query = { job: jobId };
    if (stage) query.pipeline_stage = stage;

    const applications = await Application.find(query)
      .populate('job', 'title company location')
      .populate('applicant', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Application.countDocuments(query);

    return successResponse(res, 200, 'Applications for job retrieved successfully', {
      applications,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalApplications: count
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update Application Stage (Admin Only - The Kanban Logic)
const updateApplicationStage = async (req, res, next) => {
  try {
    const { stage, notes } = req.body;

    // Find the application first
    const application = await Application.findById(req.params.id);

    if (!application) return errorResponse(res, 404, 'Application not found');

    // Update the current stage
    application.pipeline_stage = stage;

    // Push new entry to history (This is where adminNotes now live)
    application.stage_history.push({
      stage: stage,
      changed_by: req.user.id,
      notes: notes || `Moved to ${stage} stage`
    });

    await application.save();
    
    await application.populate('job', 'title company');
    await application.populate('applicant', 'name email');

    return successResponse(res, 200, `Moved to ${stage} successfully`, application);
  } catch (error) {
    next(error);
  }
};

// 5. Get Application by ID
const getApplicationById = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('job', 'title company location type')
      .populate('applicant', 'name email')
      .populate('stage_history.changed_by', 'name role'); // Helpful for admins to see who moved the candidate

    if (!application) return errorResponse(res, 404, 'Application not found');

    // Access Control
    if (req.user.role !== 'admin' && application.applicant._id.toString() !== req.user.id) {
      return errorResponse(res, 403, 'Access denied');
    }

    return successResponse(res, 200, 'Application retrieved successfully', application);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyForJob,
  getMyApplications,
  getAllApplications,
  getJobApplications,
  updateApplicationStage, // Renamed from updateApplicationStatus
  getApplicationById
};