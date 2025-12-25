const AuditLog = require('../models/AuditLog');

/**
 * Create an audit log entry
 * Never throws errors - fails silently to avoid breaking main logic
 */
const createAuditLog = async (logData) => {
  try {
    const {
      user,
      action,
      resource,
      resourceId = null,
      ipAddress = null,
      userAgent = null,
      details = {},
      status = 'success',
      severity = 'low'
    } = logData;

    if (!user || !action || !resource) {
      console.error('[Audit] Missing required fields:', { user, action, resource });
      return null;
    }

    const auditEntry = await AuditLog.create({
      user,
      action,
      resource,
      resourceId,
      ipAddress,
      userAgent,
      details,
      status,
      severity
    });

    console.log(`[Audit] ${action} by User ${user} on ${resource}${resourceId ? ' ID: ' + resourceId : ''}`);
    return auditEntry;

  } catch (error) {
    console.error('[Audit] Failed to create log:', error.message);
    return null;
  }
};

/**
 * Bulk create audit logs (for batch operations)
 */
const createBulkAuditLogs = async (logsArray) => {
  try {
    if (!Array.isArray(logsArray) || logsArray.length === 0) {
      return [];
    }

    const logs = await AuditLog.insertMany(logsArray, { ordered: false });
    console.log(`[Audit] Created ${logs.length} bulk entries`);
    return logs;

  } catch (error) {
    console.error('[Audit] Bulk creation failed:', error.message);
    return [];
  }
};

/**
 * Get audit logs with filters and pagination
 */
const getAuditLogs = async (filters = {}, options = {}) => {
  try {
    const {
      page = 1,
      limit = 50,
      sortBy = '-createdAt'
    } = options;

    const query = {};

    // Apply filters
    if (filters.user) query.user = filters.user;
    if (filters.action) query.action = filters.action;
    if (filters.resource) query.resource = filters.resource;
    if (filters.resourceId) query.resourceId = filters.resourceId;
    if (filters.status) query.status = filters.status;
    if (filters.severity) query.severity = filters.severity;

    // Date range filtering
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('user', 'name email role')
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    return {
      logs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    };

  } catch (error) {
    console.error('[Audit] Query failed:', error.message);
    throw error;
  }
};

/**
 * Get audit logs for specific resource
 */
const getResourceAuditLogs = async (resource, resourceId, options = {}) => {
  try {
    const { limit = 20, sortBy = '-createdAt' } = options;

    const logs = await AuditLog.find({ resource, resourceId })
      .populate('user', 'name email role')
      .sort(sortBy)
      .limit(limit)
      .lean();

    return logs;

  } catch (error) {
    console.error('[Audit] Resource query failed:', error.message);
    return [];
  }
};

module.exports = {
  createAuditLog,
  createBulkAuditLogs,
  getAuditLogs,
  getResourceAuditLogs
};