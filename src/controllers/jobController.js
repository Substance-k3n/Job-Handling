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
    const { title, description, location, type, work_mode, key_responsibilities, what_we_offer, requirements, deadline } = req.body;

    if (!title || !description || !deadline) {
      return errorResponse(res, 400, 'Title, description, and deadline are required');
    }

    const job = await Job.create({
      title,
      description,
      location,
      type,
      work_mode,
      key_responsibilities,
      what_we_offer,
      requirements,
      deadline,
      status: 'INACTIVE',
      createdBy: req.user._id,
      hasField: false
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
      .select('title description status location type work_mode deadline hasField createdAt updatedAt');

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
      location: job.location,
      type: job.type,
      work_mode: job.work_mode,
      key_responsibilities: job.key_responsibilities,
      what_we_offer: job.what_we_offer,
      requirements: job.requirements,
      status: job.status,
      deadline: job.deadline,
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

    const previousStatus = job.status;

    job.status = status;
    await job.save();

    // Create audit log for status change / metadata update (non-blocking)
    try {
      let action = 'JOB_UPDATED';
      if (previousStatus === 'INACTIVE' && status === 'ACTIVE') {
        action = 'JOB_REOPENED';
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
          deadline: job.deadline
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
 * Updates metadata fields: title, description, location, type, work_mode, key_responsibilities, what_we_offer, requirements, deadline, status
 */
exports.updateJobMetadata = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { title, description, status, location, type, work_mode, key_responsibilities, what_we_offer, requirements, deadline } = req.body;

    const job = await Job.findById(jobId);
    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    // Validate status if provided
    if (status !== undefined && !['ACTIVE', 'INACTIVE'].includes(String(status).toUpperCase())) {
      return errorResponse(res, 400, 'Invalid status. Must be ACTIVE or INACTIVE');
    }

    // If status is changed to ACTIVE, ensure job is ready (has at least one field)
    if (status && String(status).toUpperCase() === 'ACTIVE' && !job.hasField) {
      return errorResponse(res, 400, 'Cannot publish job without form fields. Please add at least one field first.');
    }

    // Build updates object only with provided fields
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = String(status).toUpperCase();
    if (location !== undefined) updates.location = location;
    if (type !== undefined) updates.type = type;
    if (work_mode !== undefined) updates.work_mode = work_mode;
    if (key_responsibilities !== undefined) updates.key_responsibilities = key_responsibilities;
    if (what_we_offer !== undefined) updates.what_we_offer = what_we_offer;
    if (requirements !== undefined) updates.requirements = requirements;
    if (deadline !== undefined) {
      const dl = new Date(deadline);
      if (isNaN(dl.getTime())) {
        return errorResponse(res, 400, 'Invalid deadline date');
      }
      if (dl < new Date()) {
        return errorResponse(res, 400, 'Deadline must be in the future');
      }
      updates.deadline = dl;
    }

    Object.assign(job, updates);
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
      updatedAt: job.updatedAt
    });

  } catch (error) {
    next(error);
  }
};