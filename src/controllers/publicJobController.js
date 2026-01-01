const Job = require('../models/Job');
const JobField = require('../models/JobField');
const { successResponse, errorResponse } = require('../utils/responseUtils');

/**
 * STEP 1: Fetch Available Jobs (Public)
 * GET /jobs
 */
exports.getPublicJobs = async (req, res, next) => {
  try {
    const now = new Date();

    // Find visible jobs
    const jobs = await Job.find({
      status: 'ACTIVE',
      validFrom: { $lte: now },
      validTo: { $gte: now }
    })
      .select('title description validFrom validTo')
      .sort({ createdAt: -1 });

    // Format response (shortDescription = first 100 chars of description)
    const formattedJobs = jobs.map(job => ({
      id: job._id,
      title: job.title,
      shortDescription: job.description.substring(0, 100) + (job.description.length > 100 ? '...' : ''),
      validFrom: job.validFrom,
      validTo: job.validTo
    }));

    return successResponse(res, 200, 'Jobs retrieved successfully', formattedJobs);

  } catch (error) {
    next(error);
  }
};

/**
 * STEP 2: Fetch Single Job + Form Schema (Public)
 * GET /jobs/:jobId
 */
exports.getPublicJobById = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    // Check if job is visible
    if (!job.checkVisibility()) {
      return errorResponse(res, 403, 'This job is no longer available');
    }

    // Get job fields
    const jobFields = await JobField.findOne({ jobId });

    // Always add required applicant fields (name, email, phone, country, city)
    const fields = jobFields && jobFields.fields ? 
      jobFields.fields.sort((a, b) => a.order - b.order) : [];

    return successResponse(res, 200, 'Job retrieved successfully', {
      id: job._id,
      title: job.title,
      description: job.description,
      fields
    });

  } catch (error) {
    next(error);
  }
};