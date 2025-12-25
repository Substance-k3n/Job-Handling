const AuditLog = require('./models/AuditLog');

/**
 * @desc    Create an audit log entry
 * @param   {Object} logData - The audit log data
 * @returns {Promise<AuditLog>}
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

    // Validate required fields
    if (!user || !action || !resource) {
      console.error('[Audit Log] Missing required fields:', logData);
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

    console.log(`[Audit Log] ${action} by User ${user} on ${resource} ${resourceId || ''}`);
    return auditEntry;

  } catch (error) {
    // Never throw errors in audit logging (fail silently to avoid breaking main logic)
    console.error('[Audit Log] Failed to create log:', error.message);
    return null;
  }
};

/**
 * @desc    Bulk create audit logs (for batch operations)
 * @param   {Array} logsArray - Array of log data objects
 * @returns {Promise<Array>}
 */
const createBulkAuditLogs = async (logsArray) => {
  try {
    if (!Array.isArray(logsArray) || logsArray.length === 0) {
      return [];
    }

    const logs = await AuditLog.insertMany(logsArray, { ordered: false });
    console.log(`[Audit Log] Created ${logs.length} bulk entries`);
    return logs;

  } catch (error) {
    console.error('[Audit Log] Bulk creation failed:', error.message);
    return [];
  }
};

/**
 * @desc    Get audit logs with filters
 * @param   {Object} filters - Query filters
 * @param   {Object} options - Pagination options
 * @returns {Promise<Object>}
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
    console.error('[Audit Log] Query failed:', error.message);
    throw error;
  }
};

module.exports = {
  createAuditLog,
  createBulkAuditLogs,
  getAuditLogs
};