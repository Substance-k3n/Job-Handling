const Job = require('../models/Job');
const JobField = require('../models/JobField');
const { successResponse, errorResponse } = require('../utils/responseUtils');

/**
 * STEP 2: Create Job (Admin)
 * POST /admin/jobs
 */
exports.createJob = async (req, res, next) => {
  try {
    const { title, description, validFrom, validTo } = req.body;

    if (!title || !description || !validTo) {
      return errorResponse(res, 400, 'Title, description, and validTo are required');
    }

    const job = await Job.create({
      title,
      description,
      status: 'INACTIVE',
      validFrom: validFrom || new Date(),
      validTo,
      createdBy: req.user._id,
      hasField: false // New jobs have no fields by default
    });

    return successResponse(res, 201, 'Job created successfully', {
      id: job._id,
      hasField: job.hasField,
      status: job.status
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get All Jobs (Admin) - WITH FILTERING
 * GET /admin/jobs?status=ACTIVE&hasField=true
 */
exports.getAdminJobs = async (req, res, next) => {
  try {
    // Build filter object
    const filter = {};

    // Filter by status (ACTIVE, INACTIVE)
    if (req.query.status) {
      filter.status = req.query.status.toUpperCase();
    }

    // Filter by hasField (true, false)
    if (req.query.hasField !== undefined) {
      filter.hasField = req.query.hasField === 'true';
    }

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .select('title description status validFrom validTo hasField createdAt');

    return successResponse(res, 200, 'Jobs retrieved successfully', {
      total: jobs.length,
      filters: {
        status: req.query.status || null,
        hasField: req.query.hasField || null
      },
      jobs
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Job (Admin)
 * GET /admin/jobs/:jobId
 */
exports.getAdminJobById = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    const jobFields = await JobField.findOne({ jobId });

    return successResponse(res, 200, 'Job retrieved successfully', {
      id: job._id,
      title: job.title,
      description: job.description,
      status: job.status,
      validFrom: job.validFrom,
      validTo: job.validTo,
      hasField: job.hasField,
      isReadyToPublish: job.isReadyToPublish(),
      fields: jobFields ? jobFields.fields.sort((a, b) => a.order - b.order) : []
    });

  } catch (error) {
    next(error);
  }
};

/**
 * STEP 4: Publish Job (Change Status)
 * PATCH /admin/jobs/:jobId/status
 */
exports.updateJobStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return errorResponse(res, 400, 'Invalid status. Must be ACTIVE or INACTIVE');
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    // Check if job is ready to be published
    if (status === 'ACTIVE' && !job.hasField) {
      return errorResponse(res, 400, 'Cannot publish job without form fields. Please add at least one field first.');
    }

    // UPDATE: If status is ACTIVE, set validFrom to current date/time
    if (status === 'ACTIVE') {
      job.validFrom = new Date(); 
    }

    job.status = status;
    await job.save();

    return successResponse(res, 200, 'Job published and live successfully', {
      id: job._id,
      status: job.status,
      hasField: job.hasField,
      validFrom: job.validFrom
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete Job (Admin)
 * DELETE /admin/jobs/:jobId
 */
exports.deleteJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findByIdAndDelete(jobId);
    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    await JobField.deleteOne({ jobId });

    return successResponse(res, 200, 'Job deleted successfully');

  } catch (error) {
    next(error);
  }
};