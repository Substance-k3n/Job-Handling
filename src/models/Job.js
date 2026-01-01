const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Job description is required']
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'INACTIVE'
  },
  validFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  validTo: {
    type: Date,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for performance
jobSchema.index({ status: 1, validFrom: 1, validTo: 1 });

// Virtual to check if job is visible to users
jobSchema.virtual('isVisible').get(function() {
  const now = new Date();
  return this.status === 'ACTIVE' && now >= this.validFrom && now <= this.validTo;
});

// Method to check visibility
jobSchema.methods.checkVisibility = function() {
  const now = new Date();
  
  // Auto-close if deadline passed
  if (now > this.validTo && this.status === 'ACTIVE') {
    this.status = 'INACTIVE';
    return false;
  }
  
  return this.status === 'ACTIVE' && now >= this.validFrom && now <= this.validTo;
};

module.exports = mongoose.model('Job', jobSchema);