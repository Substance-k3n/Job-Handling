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

  /* --- ENTERPRISE PIPELINE FIELDS --- */
  pipeline_stage: {
    type: String,
    enum: ['applied', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'],
    default: 'applied',
    index: true
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

  /* --- LEGACY STATUS (kept for backward compatibility) --- */
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'accepted', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String
  }
}, {
  timestamps: true
});

/* --- PRE-SAVE HOOKS --- */

// Update timestamp when stage changes
applicationSchema.pre('save', function(next) {
  if (this.isModified('pipeline_stage') && !this.isNew) {
    this.current_stage_entered = new Date();
  }
  next();
});

// Initialize stage history on creation
applicationSchema.pre('save', function(next) {
  if (this.isNew) {
    this.current_stage_entered = new Date();
    this.stage_history.push({
      stage: 'applied',
      changed_by: this.applicant, 
      changed_at: new Date(),
      notes: 'Application submitted by candidate'
    });
  }
  next();
});

// Indexes
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ pipeline_stage: 1, createdAt: -1 });
applicationSchema.index({ applicant: 1, createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);