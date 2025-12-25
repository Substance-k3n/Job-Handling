const { getAuditLogs } = require('../utils/auditLogger');
const { successResponse, errorResponse } = require('../utils/responseUtils');

/**
 * @desc    Get all system audit logs (Admin Only)
 * @route   GET /api/audit
 * @access  Private/Admin
 */
exports.getAllLogs = async (req, res, next) => {
  try {
    // Extract query params for filtering
    const filters = {
      user: req.query.user,
      action: req.query.action,
      resource: req.query.resource,
      status: req.query.status,
      severity: req.query.severity,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const options = {
      page: req.query.page || 1,
      limit: req.query.limit || 50,
      sortBy: req.query.sortBy || '-createdAt'
    };

    const result = await getAuditLogs(filters, options);

    return successResponse(res, 200, 'Audit logs retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};