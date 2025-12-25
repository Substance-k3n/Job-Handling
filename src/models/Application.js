const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coverLetter: {
    type: String,
    trim: true
  },
  cvPath: {
    type: String,
    required: [true, 'CV is required']
  },

  /* --- NEW ENTERPRISE PIPELINE FIELDS --- */
  pipeline_stage: {
    type: String,
    enum: ['applied', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'],
    default: 'applied',
    index: true // Optimized for Kanban board filteringAuditLog
  },

  stage_history: [{
    stage: {
      type: String,
      enum: ['applied', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'],
      required: true
    },
    changed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changed_at: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],

  current_stage_entered: {
    type: Date,
    default: Date.now
  },

 
}, {
  timestamps: true
});
/* --- PRE-SAVE HOOKS --- */

// 1. Update timestamp when stage changes (keep existing)
applicationSchema.pre('save', function(next) {
  if (this.isModified('pipeline_stage') && !this.isNew) {
    this.current_stage_entered = new Date();
  }
  next();
});

// 2. Initialize stage history on creation (UPDATED)
applicationSchema.pre('save', function(next) {
  if (this.isNew) {
    this.current_stage_entered = new Date(); // Set initial timestamp
    this.stage_history.push({
      stage: 'applied',
      changed_by: this.applicant, 
      changed_at: new Date(),
      notes: 'Application submitted by candidate'
    });
  }
  next();
});

// Prevent duplicate applications
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);