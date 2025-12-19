const Application = require('../models/Application');
const Job = require('../models/Job');
const { successResponse, errorResponse } = require('../utils/responseUtils');

const applyForJob = async (req, res, next) => {
  try {
    const { jobId, coverLetter } = req.body;
//Job Validation
    const job = await Job.findById(jobId);
    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }
    if (job.status !== 'active') {
      return errorResponse(res, 400, 'This job is no longer accepting applications');
    }

    if (!req.file) {
      return errorResponse(res, 400, 'CV file is required');
    }

    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: req.user.id
    });

    if (existingApplication) {
      return errorResponse(res, 400, 'You have already applied for this job');
    }

    const application = await Application.create({
      job: jobId,
      applicant: req.user.id,
      coverLetter,
      cvPath: req.file.path
    });

    await application.populate('job', 'title ');
    await application.populate('applicant', 'name email');

    return successResponse(res, 201, 'Application submitted successfully', application);
  } catch (error) {
    next(error);
  }
};

const getMyApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ applicant: req.user.id })
      .populate('job', 'title company location type status')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Applications retrieved successfully', applications);
  } catch (error) {
    next(error);
  }
};

const getAllApplications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, jobId } = req.query;

    const query = {};
    if (status) query.status = status;
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

const getJobApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ job: req.params.jobId })
      .populate('applicant', 'name email')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Job applications retrieved successfully', applications);
  } catch (error) {
    next(error);
  }
};

const getApplicationById = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('job', 'title company location type')
      .populate('applicant', 'name email');

    if (!application) {
      return errorResponse(res, 404, 'Application not found');
    }

    if (req.user.role !== 'admin' && application.applicant._id.toString() !== req.user.id) {
      return errorResponse(res, 403, 'Access denied');
    }

    return successResponse(res, 200, 'Application retrieved successfully', application);
  } catch (error) {
    next(error);
  }
};

const updateApplicationStatus = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status, adminNotes },
      { new: true, runValidators: true }
    )
      .populate('job', 'title company')
      .populate('applicant', 'name email');

    if (!application) {
      return errorResponse(res, 404, 'Application not found');
    }

    return successResponse(res, 200, 'Application status updated successfully', application);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyForJob,
  getMyApplications,
  getAllApplications,
  getJobApplications,
  getApplicationById,
  updateApplicationStatus
};