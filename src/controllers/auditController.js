const { getAuditLogs, getResourceAuditLogs } = require('../utils/auditLogger');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const mongoose = require('mongoose');

/**
 * @desc    Get all system audit logs (Admin Only)
 * @route   GET /api/audit
 * @access  Private/Admin
 */
exports.getAllLogs = async (req, res, next) => {
  try {
    const filters = {
      user: req.query.user,
      action: req.query.action,
      resource: req.query.resource,
      resourceId: req.query.resourceId,
      status: req.query.status,
      severity: req.query.severity,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      sortBy: req.query.sortBy || '-createdAt'
    };

    const result = await getAuditLogs(filters, options);

    return successResponse(res, 200, 'Audit logs retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get audit logs for a specific resource (job/application)
 * @route   GET /api/audit/:resource/:resourceId
 * @access  Private/Admin
 */
exports.getResourceLogs = async (req, res, next) => {
  try {
    const { resource, resourceId } = req.params;

    // Validate resource type
    const validResources = ['User', 'Job', 'Application', 'System'];
    if (!validResources.includes(resource)) {
      return errorResponse(res, 400, 'Invalid resource type');
    }

    // Validate ObjectId if not System
    if (resource !== 'System' && !mongoose.Types.ObjectId.isValid(resourceId)) {
      return errorResponse(res, 400, 'Invalid resource ID format');
    }

    const logs = await getResourceAuditLogs(resource, resourceId, {
      limit: parseInt(req.query.limit) || 20
    });

    return successResponse(res, 200, `Audit logs for ${resource} retrieved`, logs);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user's audit activity
 * @route   GET /api/audit/my-activity
 * @access  Private
 */
exports.getMyActivity = async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      sortBy: '-createdAt'
    };

    const result = await getAuditLogs({ user: req.user._id }, options);

    return successResponse(res, 200, 'Your activity retrieved', result);
  } catch (error) {
    next(error);
  }
};