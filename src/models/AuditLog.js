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
      'JOB_VIEWED',
      
      // Application Events
      'APPLICATION_SUBMITTED',
      'APPLICATION_VIEWED',
      'APPLICATION_DELETED',
      'STAGE_CHANGED',
      'CV_DOWNLOADED',
      'CV_VIEWED',
      
      // User Management
      'USER_ROLE_CHANGED',
      'USER_DELETED',
      'USER_UPDATED',
      'USER_CREATED',
      
      // System Events
      'BULK_DELETE',
      'EXPORT_DATA',
      'SETTINGS_CHANGED',
      'DATA_RETENTION_EXECUTED'
    ],
    index: true
  },
  resource: {
    type: String,
    enum: ['User', 'Job', 'Application', 'System', 'Auth'],
    required: true,
    index: true
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
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    default: 'success',
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ createdAt: -1 });

// Auto-delete logs older than 90 days (GDPR compliance)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('AuditLog', auditLogSchema);