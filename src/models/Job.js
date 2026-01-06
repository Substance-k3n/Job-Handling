const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'INACTIVE',
    index: true
  },
  validFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  validTo: {
    type: Date,
    // Required when creating a new job, but do not
    // block updates for legacy jobs that may not
    // have this field set yet.
    required: [function() { return this.isNew; }, 'Valid to date is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Required on creation, but allow saving existing
    // documents that were created before this field
    // was introduced.
    required: [function() { return this.isNew; }, 'Created by user is required']
  },
  hasField: {
    type: Boolean,
    default: false,
    index: true,
    description: 'Indicates if job has form fields added. False when created, true after first field is added.'
  }
}, {
  timestamps: true
});

/**
 * Method to check if job is visible to public users
 * A job is visible if:
 * - status is ACTIVE
 * - current time is >= validFrom
 * - current time is <= validTo
 */
jobSchema.methods.checkVisibility = function() {
  const now = new Date();
  return (
    this.status === 'ACTIVE' &&
    now >= this.validFrom &&
    now <= this.validTo
  );
};

/**
 * Method to check if job is ready to be published
 * A job is ready if it has at least one field
 */
jobSchema.methods.isReadyToPublish = function() {
  return this.hasField === true;
};

/**
 * Index for efficient querying of active jobs
 */
jobSchema.index({ status: 1, validFrom: 1, validTo: 1 });

/**
 * Index for filtering jobs by hasField status
 */
jobSchema.index({ hasField: 1, createdBy: 1 });

module.exports = mongoose.model('Job', jobSchema);