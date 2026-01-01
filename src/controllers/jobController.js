const Job = require('../models/Job');
const JobField = require('../models/JobField');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const mongoose = require('mongoose');

/**
 * STEP 2: Create Job (Admin)
 * POST /admin/jobs
 */
exports.createJob = async (req, res, next) => {
  try {
    const { title, description, validFrom, validTo } = req.body;

    // Validation
    if (!title || !description || !validTo) {
      return errorResponse(res, 400, 'Title, description, and validTo are required');
    }

    // Create job (status = INACTIVE by default)
    const job = await Job.create({
      title,
      description,
      status: 'INACTIVE',
      validFrom: validFrom || new Date(),
      validTo,
      createdBy: req.user._id
    });

    return successResponse(res, 201, 'Job created successfully', {
      id: job._id
    });

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

    // Validate job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    // Generate field ID
    const fieldId = `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Find or create JobField document
    let jobFields = await JobField.findOne({ jobId });

    if (!jobFields) {
      jobFields = await JobField.create({
        jobId,
        fields: []
      });
    }

    // Add new field
    jobFields.fields.push({
      id: fieldId,
      type,
      question,
      options: options || [],
      required: required !== undefined ? required : false,
      order
    });

    await jobFields.save();

    return successResponse(res, 201, 'Field added successfully', {
      fieldId
    });

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

    // Update order for each field
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

    // Update field properties
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

    job.status = status;
    await job.save();

    return successResponse(res, 200, 'Job status updated successfully', {
      id: job._id,
      status: job.status
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
      .select('title description status validFrom validTo createdAt');

    return successResponse(res, 200, 'Jobs retrieved successfully', jobs);

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

    // Also delete associated fields
    await JobField.deleteOne({ jobId });

    return successResponse(res, 200, 'Job deleted successfully');

  } catch (error) {
    next(error);
  }
};