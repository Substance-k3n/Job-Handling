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
    // ... validation ...

    const job = await Job.create({
      title,
      description,
      status: 'INACTIVE',
      hasField: false, // <--- EXPLICITLY SET THIS ON CREATION
      validFrom: validFrom || new Date(),
      validTo,
      createdBy: req.user._id
    });

    return successResponse(res, 201, 'Job created successfully', { id: job._id });
  } catch (error) {
    next(error);
  }
};

/**
 * STEP 3: Add Job Field
 * POST /admin/jobs/:jobId/fields
 */
exports.addJobField = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { type, question, options, required, order } = req.body;

    const job = await Job.findById(jobId);
    if (!job) return errorResponse(res, 404, 'Job not found');

    // 1. ADD THE FIELD
    let jobFields = await JobField.findOne({ jobId });
    if (!jobFields) {
      jobFields = await JobField.create({ jobId, fields: [] });
    }

    jobFields.fields.push({
      id: `field_${Date.now()}`,
      type,
      question,
      options: options || [],
      required: required || false,
      order
    });

    await jobFields.save();

    // 2. FLIP THE BOOLEAN ON THE JOB MODEL
    job.hasField = true; 
    await job.save();

    return successResponse(res, 201, 'Field added and Job updated', { fieldId });
  } catch (error) {
    next(error);
  }
};

/**
 * Reorder Fields
 * PATCH /admin/jobs/:jobId/fields/reorder
 */
exports.reorderFields = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { orders } = req.body;

    const jobFields = await JobField.findOne({ jobId });
    if (!jobFields) {
      return errorResponse(res, 404, 'Job fields not found');
    }

    orders.forEach(({ fieldId, order }) => {
      const field = jobFields.fields.find(f => f.id === fieldId);
      if (field) {
        field.order = order;
      }
    });

    await jobFields.save();

    return successResponse(res, 200, 'Fields reordered successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * Update Field
 * PATCH /admin/jobs/:jobId/fields/:fieldId
 */
exports.updateJobField = async (req, res, next) => {
  try {
    const { jobId, fieldId } = req.params;
    const updates = req.body;

    const jobFields = await JobField.findOne({ jobId });
    if (!jobFields) {
      return errorResponse(res, 404, 'Job fields not found');
    }

    const field = jobFields.fields.find(f => f.id === fieldId);
    if (!field) {
      return errorResponse(res, 404, 'Field not found');
    }

    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== '_id') {
        field[key] = updates[key];
      }
    });

    await jobFields.save();

    return successResponse(res, 200, 'Field updated successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * Delete Field
 * DELETE /admin/jobs/:jobId/fields/:fieldId
 */
exports.deleteJobField = async (req, res, next) => {
  try {
    const { jobId, fieldId } = req.params;

    const jobFields = await JobField.findOne({ jobId });
    if (!jobFields) {
      return errorResponse(res, 404, 'Job fields not found');
    }

    jobFields.fields = jobFields.fields.filter(f => f.id !== fieldId);
    await jobFields.save();

    return successResponse(res, 200, 'Field deleted successfully');

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

    // UPDATE: If status is ACTIVE, set validFrom to current date/time
    // This ensures now >= validFrom is TRUE
    if (status === 'ACTIVE') {
      job.validFrom = new Date(); 
    }

    job.status = status;
    await job.save();

    return successResponse(res, 200, 'Job published and live successfully', {
      id: job._id,
      status: job.status,
      validFrom: job.validFrom // Include this to verify it changed from Jan 12th
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get All Jobs (Admin)
 * GET /admin/jobs
 */
exports.getAdminJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find()
      .sort({ createdAt: -1 })
      // Add 'hasField' to the select string so it's included in the results
      .select('title description status hasField validFrom validTo createdAt'); 

    return successResponse(res, 200, 'Jobs retrieved successfully', jobs);

  } catch (error) {
    next(error);
  }
};
exports.getAdminJobById = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    
    if (!job) return errorResponse(res, 404, 'Job not found');

    const jobFields = await JobField.findOne({ jobId });

    return successResponse(res, 200, 'Job retrieved successfully', {
      id: job._id,
      title: job.title,
      description: job.description,
      status: job.status,
      hasField: job.hasField || false, // <--- ADD THIS LINE
      validFrom: job.validFrom,
      validTo: job.validTo,
      fields: jobFields ? jobFields.fields.sort((a, b) => a.order - b.order) : []
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