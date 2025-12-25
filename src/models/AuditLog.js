const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication Events
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'PASSWORD_CHANGED',
      'REGISTER',
      
      // Job Management
      'JOB_CREATED',
      'JOB_UPDATED',
      'JOB_DELETED',
      'JOB_CLOSED',
      'JOB_REOPENED',
      
      // Application Events
      'APPLICATION_SUBMITTED',
      'APPLICATION_DELETED',
      'STAGE_CHANGED',
      
      // User Management
      'USER_ROLE_CHANGED',
      'USER_DELETED',
      'USER_UPDATED',
      
      // System Events
      'BULK_DELETE',
      'EXPORT_DATA',
      'SETTINGS_CHANGED'
    ],
    index: true
  },
  resource: {
    type: String,
    enum: ['User', 'Job', 'Application', 'System', 'Auth'],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Flexible JSON object
    default: {}
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    default: 'success'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  }
}, {
  timestamps: true // Auto-adds createdAt and updatedAt
});

// Compound indexes for efficient querying
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ createdAt: -1 }); // For time-based queries

// Auto-delete logs older than 90 days (optional compliance rule)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = mongoose.model('AuditLog', auditLogSchema);