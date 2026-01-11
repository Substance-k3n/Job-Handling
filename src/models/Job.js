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
  
  // New metadata fields
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    default: 'Addis Ababa, Ethiopia'
  },
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship'],
    required: [true, 'Job type is required'],
    default: 'full-time'
  },
  work_mode: {
    type: String,
    enum: ['remote', 'onsite', 'hybrid'],
    required: [true, 'Work mode is required'],
    default: 'onsite'
  },
  key_responsibilities: {
    type: [String],
    default: [],
    validate: {
      validator: function(v) {
        return Array.isArray(v);
      },
      message: 'Key responsibilities must be an array of strings'
    }
  },
  what_we_offer: {
    type: [String],
    default: [],
    validate: {
      validator: function(v) {
        return Array.isArray(v);
      },
      message: 'What we offer must be an array of strings'
    }
  },
  requirements: {
    type: [String],
    default: [],
    validate: {
      validator: function(v) {
        return Array.isArray(v);
      },
      message: 'Requirements must be an array of strings'
    }
  },
  
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'INACTIVE',
    index: true
  },
  
  // Removed validFrom, only deadline now
  deadline: {
    type: Date,
    required: [function() { return this.isNew; }, 'Deadline is required']
  },
  
  // New flag to track if deadline has passed
  isPastDeadline: {
    type: Boolean,
    default: false,
    index: true,
    description: 'True if current time > deadline. Used to filter ended jobs while keeping responses accessible.'
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [function() { return this.isNew; }, 'Created by user is required']
  },
  
  hasField: {
    type: Boolean,
    default: false,
    index: true,
    description: 'Indicates if job has form fields added'
  }
}, {
  timestamps: true
});

/**
 * Method to check if job is visible to public users
 * A job is visible if:
 * - status is ACTIVE
 * - current time <= deadline
 */
jobSchema.methods.checkVisibility = function() {
  const now = new Date();
  return (
    this.status === 'ACTIVE' &&
    now <= this.deadline
  );
};

/**
 * Method to check if job is ready to be published
 */
jobSchema.methods.isReadyToPublish = function() {
  return this.hasField === true;
};

/**
 * Method to update isPastDeadline flag
 * Call this to check if deadline has passed
 */
jobSchema.methods.updateDeadlineStatus = function() {
  const now = new Date();
  this.isPastDeadline = now > this.deadline;
  return this.isPastDeadline;
};

/**
 * Pre-save hook to automatically update isPastDeadline
 */
jobSchema.pre('save', function(next) {
  if (this.deadline) {
    const now = new Date();
    this.isPastDeadline = now > this.deadline;
  }
  next();
});

/**
 * Index for efficient querying of active jobs
 */
jobSchema.index({ status: 1, deadline: 1 });

/**
 * Index for filtering by deadline status
 */
jobSchema.index({ isPastDeadline: 1, status: 1 });

/**
 * Index for filtering jobs by hasField status
 */
jobSchema.index({ hasField: 1, createdBy: 1 });

module.exports = mongoose.model('Job', jobSchema);