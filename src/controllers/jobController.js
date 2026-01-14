const Job = require('../models/Job');
const JobField = require('../models/JobField');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const { createAuditLog } = require('../utils/auditLogger');

/**
 * STEP 2: Create Job (Admin)
 * POST /admin/jobs
 */
exports.createJob = async (req, res, next) => {
  try {
    const { 
      title, 
      description, 
      location,
      type,
      work_mode,
      key_responsibilities,
      what_we_offer,
      requirements,
      deadline 
    } = req.body;

    // Validate required fields
    if (!title || !description || !deadline) {
      return errorResponse(res, 400, 'Title, description, and deadline are required');
    }

    const job = await Job.create({
      title,
      description,
      location: location || 'Addis Ababa, Ethiopia',
      type: type || 'full-time',
      work_mode: work_mode || 'onsite',
      key_responsibilities: key_responsibilities || [],
      what_we_offer: what_we_offer || [],
      requirements: requirements || [],
      status: 'INACTIVE',
      deadline,
      createdBy: req.user._id,
      hasField: false
    });

    return successResponse(res, 201, 'Job created successfully', {
      id: job._id,
      hasField: job.hasField,
      status: job.status,
      isPastDeadline: job.isPastDeadline,
      createdAt: job.createdAt
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get All Jobs (Admin) - WITH FILTERING
 * GET /admin/jobs?status=ACTIVE&hasField=true&isPastDeadline=false
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

    // Filter by isPastDeadline (true, false)
    if (req.query.isPastDeadline !== undefined) {
      filter.isPastDeadline = req.query.isPastDeadline === 'true';
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const totalJobs = await Job.countDocuments(filter);
    const totalPages = Math.ceil(totalJobs / limit);

    // Get paginated jobs
    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('title description location type work_mode status deadline isPastDeadline hasField createdAt updatedAt');

    return successResponse(res, 200, 'Jobs retrieved successfully', {
      jobs,
      pagination: {
        currentPage: page,
        totalPages,
        totalJobs,
        jobsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        status: req.query.status || null,
        hasField: req.query.hasField || null,
        isPastDeadline: req.query.isPastDeadline || null
      }
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
      location: job.location,
      type: job.type,
      work_mode: job.work_mode,
      key_responsibilities: job.key_responsibilities,
      what_we_offer: job.what_we_offer,
      requirements: job.requirements,
      status: job.status,
      deadline: job.deadline,
      isPastDeadline: job.isPastDeadline,
      hasField: job.hasField,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
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

    const previousStatus = job.status;
    job.status = status;
    
    // Update deadline status
    job.updateDeadlineStatus();
    
    await job.save();

    // Create audit log for status change (non-blocking)
    try {
      let action = 'JOB_UPDATED';
      if (previousStatus === 'INACTIVE' && status === 'ACTIVE') {
        action = 'JOB_PUBLISHED';
      } else if (previousStatus === 'ACTIVE' && status === 'INACTIVE') {
        action = 'JOB_CLOSED';
      }

      await createAuditLog({
        user: req.user._id,
        action,
        resource: 'Job',
        resourceId: job._id,
        ipAddress: req.auditMetadata?.ipAddress,
        userAgent: req.auditMetadata?.userAgent,
        details: {
          previousStatus,
          newStatus: job.status,
          deadline: job.deadline,
          isPastDeadline: job.isPastDeadline
        },
        severity: 'medium'
      });
    } catch (auditError) {
      console.error('Job status audit log error:', auditError.message);
    }

    return successResponse(res, 200, 'Job status updated successfully', {
      id: job._id,
      previousStatus,
      status: job.status,
      hasField: job.hasField,
      deadline: job.deadline,
      isPastDeadline: job.isPastDeadline,
      updatedAt: job.updatedAt
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

/**
 * Update Job Metadata (Admin)
 * PATCH /admin/jobs/:jobId
 * Updates job metadata fields including new fields
 */
exports.updateJobMetadata = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { 
      title, 
      description, 
      location,
      type,
      work_mode,
      key_responsibilities,
      what_we_offer,
      requirements,
      status, 
      deadline 
    } = req.body;

    const job = await Job.findById(jobId);
    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    // Validate status if provided
    if (status !== undefined && !['ACTIVE', 'INACTIVE'].includes(String(status).toUpperCase())) {
      return errorResponse(res, 400, 'Invalid status. Must be ACTIVE or INACTIVE');
    }

    // Validate type if provided
    if (type !== undefined && !['full-time', 'part-time', 'contract', 'internship'].includes(type)) {
      return errorResponse(res, 400, 'Invalid job type. Must be full-time, part-time, contract, or internship');
    }

    // Validate work_mode if provided
    if (work_mode !== undefined && !['remote', 'onsite', 'hybrid'].includes(work_mode)) {
      return errorResponse(res, 400, 'Invalid work mode. Must be remote, onsite, or hybrid');
    }

    // If status is changed to ACTIVE, ensure job is ready
    if (status && String(status).toUpperCase() === 'ACTIVE' && !job.hasField) {
      return errorResponse(res, 400, 'Cannot publish job without form fields. Please add at least one field first.');
    }

    // Build updates object
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (location !== undefined) updates.location = location;
    if (type !== undefined) updates.type = type;
    if (work_mode !== undefined) updates.work_mode = work_mode;
    if (key_responsibilities !== undefined) updates.key_responsibilities = key_responsibilities;
    if (what_we_offer !== undefined) updates.what_we_offer = what_we_offer;
    if (requirements !== undefined) updates.requirements = requirements;
    if (status !== undefined) updates.status = String(status).toUpperCase();
    if (deadline !== undefined) updates.deadline = new Date(deadline);

    // Validate deadline (must be in future)
    if (updates.deadline && updates.deadline < new Date()) {
      return errorResponse(res, 400, 'Deadline must be in the future');
    }

    Object.assign(job, updates);
    
    // Update deadline status
    job.updateDeadlineStatus();
    
    await job.save();

    return successResponse(res, 200, 'Job updated successfully', {
      id: job._id,
      title: job.title,
      description: job.description,
      location: job.location,
      type: job.type,
      work_mode: job.work_mode,
      key_responsibilities: job.key_responsibilities,
      what_we_offer: job.what_we_offer,
      requirements: job.requirements,
      status: job.status,
      deadline: job.deadline,
      isPastDeadline: job.isPastDeadline,
      updatedAt: job.updatedAt
    });

  } catch (error) {
    next(error);
  }
};