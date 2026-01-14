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

    const filter = {
      status: 'ACTIVE',
      deadline: { $gte: now }
    };

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const totalJobs = await Job.countDocuments(filter);
    const totalPages = Math.ceil(totalJobs / limit);

    // Get paginated jobs
    const jobs = await Job.find(filter)
      .select('title description location type work_mode key_responsibilities what_we_offer requirements deadline')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const formattedJobs = jobs.map(job => ({
      id: job._id,
      title: job.title,
      description: job.description,
      shortDescription: job.description.substring(0, 100) + (job.description.length > 100 ? '...' : ''),
      location: job.location,
      type: job.type,
      work_mode: job.work_mode,
      key_responsibilities: job.key_responsibilities,
      what_we_offer: job.what_we_offer,
      requirements: job.requirements,
      deadline: job.deadline
    }));

    return successResponse(res, 200, 'Jobs retrieved successfully', {
      jobs: formattedJobs,
      pagination: {
        currentPage: page,
        totalPages,
        totalJobs,
        jobsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

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
      createdAt: job.createdAt,
      fields
    });

  } catch (error) {
    next(error);
  }
};
