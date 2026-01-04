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
    // 1. Log to see exactly what Express is seeing
    console.log("POST PARAMS:", req.params); 

    // 2. Try to get the ID from params, and fallback to the URL if params are empty
    const jobId = req.params.jobId || req.originalUrl.split('/')[4]; 

    const { type, question, options, required, order } = req.body;
    // 3. Perform the validation
    if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid job ID",
        debug_captured_id: jobId 
      });
    }
    // Check if job exists
    const jobExists = await Job.findById(jobId);
    if (!jobExists) {
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
   const fieldId = new mongoose.Types.ObjectId()

    // Create field object
    const newField = {
  id: fieldId.toString(), // Store as string for easy matching in frontend
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

    await createAuditLog({
      user: req.user._id,
      action: 'FIELD_ADDED',
      resource: 'JobField',
      resourceId: jobField._id,
      ipAddress: req.auditMetadata?.ipAddress,
      userAgent: req.auditMetadata?.userAgent,
      details: {
        jobTitle: jobExists.title,
        fieldQuestion: question
      },
      severity: 'low'
    });

    return successResponse(res, 201, 'Field added successfully', {
      fieldId: fieldId
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
    // Maps your Postman key "fields" to "orders" variable
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
      // Use .id() for Mongoose subdocuments
      const field = jobField.fields.id(id); 
      if (field) {
        field.order = order;
      }
    });

    // CRITICAL: Tells Mongoose the array content changed so it actually SAVES
    jobField.markModified('fields');

    await jobField.save();

    // Audit Log logic remains the same
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

    return successResponse(res, 200, 'Field deleted successfully');

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
        fields: []
      });
    }

    // Sort fields by order
    const sortedFields = jobField.fields.sort((a, b) => a.order - b.order);

    return successResponse(res, 200, 'Job fields retrieved successfully', {
      jobId,
      fields: sortedFields
    });

  } catch (error) {
    next(error);
  }
};

