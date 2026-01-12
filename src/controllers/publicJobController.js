const Job = require('../models/Job');
const JobField = require('../models/JobField');
const { successResponse, errorResponse } = require('../utils/responseUtils');

/**
 * STEP 1: Fetch Available Jobs (Public)
 * GET /jobs
 * Returns jobs that are ACTIVE and deadline has not passed
 */
exports.getPublicJobs = async (req, res, next) => {
  try {
    const now = new Date();

    const jobs = await Job.find({
      status: 'ACTIVE',
      deadline: { $gte: now }
    })
      .select('title description location type work_mode key_responsibilities what_we_offer requirements deadline')
      .sort({ createdAt: -1 });

    const formattedJobs = jobs.map(job => ({
      id: job._id,
      title: job.title,
      description: job.description,
      location: job.location,
      type: job.type,
      work_mode: job.work_mode,
      key_responsibilities: job.key_responsibilities,
      what_we_offer: job.what_we_offer,
      requirements: job.requirements,
      deadline: job.deadline
    }));

    return successResponse(res, 200, 'Jobs retrieved successfully', formattedJobs);

  } catch (error) {
    next(error);
  }
};

/**
 * STEP 2: Fetch Single Job + Form Schema (Public)
 * GET /jobs/:jobId
 * Returns complete job details with all metadata and form fields
 */
exports.getPublicJobById = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    if (!job.checkVisibility()) {
      return errorResponse(res, 403, 'This job is no longer available');
    }

    const jobFields = await JobField.findOne({ jobId });

    const fields = jobFields && jobFields.fields ? 
      jobFields.fields.sort((a, b) => a.order - b.order) : [];

    return successResponse(res, 200, 'Job retrieved successfully', {
      id: job._id,
      title: job.title,
      description: job.description,
      location: job.location,
      type: job.type,
      work_mode: job.work_mode,
      key_responsibilities: job.key_responsibilities,
      what_we_offer: job.what_we_offer,
      requirements: job.requirements,
      deadline: job.deadline,
      fields
    });

  } catch (error) {
    next(error);
  }
};
