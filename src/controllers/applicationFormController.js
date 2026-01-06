const JobField = require('../models/JobField');
const Job = require('../models/Job');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const { createAuditLog } = require('../utils/auditLogger');
const mongoose = require('mongoose');

/**
 * @desc    Add field to job (Form Builder)
 * @route   POST /api/admin/jobs/:jobId/fields
 * @access  Private/Admin
 */
exports.addJobField = async (req, res, next) => {
  try {
    const jobId = req.params.jobId;
    const { type, question, options, required, order } = req.body;

    // Validate job ID
    if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
      return errorResponse(res, 400, 'Invalid job ID');
    }

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    // Validate field type
    const validTypes = ['short_answer', 'paragraph', 'multiple_choice', 'checkboxes', 'dropdown', 'file', 'rating', 'date', 'time'];
    if (!validTypes.includes(type)) {
      return errorResponse(res, 400, 'Invalid field type');
    }

    // Validate options for specific types
    if (['multiple_choice', 'checkboxes', 'dropdown'].includes(type)) {
      if (!options || !Array.isArray(options) || options.length === 0) {
        return errorResponse(res, 400, `Options are required for ${type} field type`);
      }
    }

    // Generate unique field ID
    const fieldId = new mongoose.Types.ObjectId();

    // Create field object
    const newField = {
      id: fieldId.toString(),
      type,
      question,
      options: options || [],
      required: !!required,
      order: order || 1
    };

    // Find or create JobField document
    let jobField = await JobField.findOne({ jobId });

    if (jobField) {
      // Add field to existing document
      jobField.fields.push(newField);
      await jobField.save();
    } else {
      // Create new JobField document
      jobField = await JobField.create({
        jobId,
        fields: [newField]
      });
    }

    // ✨ UPDATE: Set hasField to true when first field is added
    if (!job.hasField) {
      job.hasField = true;
      await job.save();
      console.log(`✅ Job ${jobId} now has fields (hasField set to true)`);
    }

    // Create audit log (if available)
    try {
      await createAuditLog({
        user: req.user._id,
        action: 'FIELD_ADDED',
        resource: 'JobField',
        resourceId: jobField._id,
        ipAddress: req.auditMetadata?.ipAddress,
        userAgent: req.auditMetadata?.userAgent,
        details: {
          jobTitle: job.title,
          fieldQuestion: question,
          fieldType: type
        },
        severity: 'low'
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError.message);
    }

    return successResponse(res, 201, 'Field added successfully', {
      fieldId: fieldId.toString(),
      jobHasField: true
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reorder job fields
 * @route   PATCH /api/admin/jobs/:jobId/fields/reorder
 * @access  Private/Admin
 */
exports.reorderFields = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { fields: orders } = req.body;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return errorResponse(res, 400, 'Invalid job ID');
    }

    if (!orders || !Array.isArray(orders)) {
      return errorResponse(res, 400, 'Orders array is required');
    }

    const jobField = await JobField.findOne({ jobId });
    if (!jobField) {
      return errorResponse(res, 404, 'Job fields not found');
    }

    // Update order for each field
    orders.forEach(({ id, order }) => {
      const field = jobField.fields.id(id);
      if (field) {
        field.order = order;
      }
    });

    jobField.markModified('fields');
    await jobField.save();

    // Create audit log
    try {
      await createAuditLog({
        user: req.user._id,
        action: 'FIELDS_REORDERED',
        resource: 'JobField',
        resourceId: jobField._id,
        ipAddress: req.auditMetadata?.ipAddress,
        userAgent: req.auditMetadata?.userAgent,
        details: { ordersCount: orders.length },
        severity: 'low'
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError.message);
    }

    return successResponse(res, 200, 'Fields reordered successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update single field
 * @route   PATCH /api/admin/jobs/:jobId/fields/:fieldId
 * @access  Private/Admin
 */
exports.updateField = async (req, res, next) => {
  try {
    const { jobId, fieldId } = req.params;
    const { type, question, options, required, order } = req.body;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return errorResponse(res, 400, 'Invalid job ID');
    }

    const jobField = await JobField.findOne({ jobId });
    if (!jobField) {
      return errorResponse(res, 404, 'Job fields not found');
    }

    const field = jobField.fields.find(f => f.id === fieldId);
    if (!field) {
      return errorResponse(res, 404, 'Field not found');
    }

    // Update field properties
    if (type) field.type = type;
    if (question) field.question = question;
    if (options !== undefined) field.options = options;
    if (required !== undefined) field.required = required;
    if (order !== undefined) field.order = order;

    await jobField.save();

    return successResponse(res, 200, 'Field updated successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete field
 * @route   DELETE /api/admin/jobs/:jobId/fields/:fieldId
 * @access  Private/Admin
 */
exports.deleteField = async (req, res, next) => {
  try {
    const { jobId, fieldId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return errorResponse(res, 400, 'Invalid job ID');
    }

    const jobField = await JobField.findOne({ jobId });
    if (!jobField) {
      return errorResponse(res, 404, 'Job fields not found');
    }

    const fieldIndex = jobField.fields.findIndex(f => f.id === fieldId);
    if (fieldIndex === -1) {
      return errorResponse(res, 404, 'Field not found');
    }

    jobField.fields.splice(fieldIndex, 1);
    await jobField.save();

    // ✨ UPDATE: If no fields left, set hasField to false
    if (jobField.fields.length === 0) {
      const job = await Job.findById(jobId);
      if (job) {
        job.hasField = false;
        await job.save();
        console.log(`⚠️  Job ${jobId} has no fields (hasField set to false)`);
      }
    }

    return successResponse(res, 200, 'Field deleted successfully', {
      remainingFields: jobField.fields.length,
      jobHasField: jobField.fields.length > 0
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get job fields (for form builder or public view)
 * @route   GET /api/admin/jobs/:jobId/fields
 * @access  Public/Admin
 */
exports.getJobFields = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return errorResponse(res, 400, 'Invalid job ID');
    }

    const jobField = await JobField.findOne({ jobId });

    if (!jobField || !jobField.fields || jobField.fields.length === 0) {
      return successResponse(res, 200, 'No fields found', {
        jobId,
        hasField: false,
        fields: []
      });
    }

    // Sort fields by order
    const sortedFields = jobField.fields.sort((a, b) => a.order - b.order);

    return successResponse(res, 200, 'Job fields retrieved successfully', {
      jobId,
      hasField: true,
      totalFields: sortedFields.length,
      fields: sortedFields
    });

  } catch (error) {
    next(error);
  }
};