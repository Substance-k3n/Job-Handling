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

jobSchema.index({ status: 1, validFrom: 1, validTo: 1 });

jobSchema.methods.checkVisibility = function() {
  const now = new Date();
  
  if (now > this.validTo && this.status === 'ACTIVE') {
    this.status = 'INACTIVE';
    return false;
  }
  
  return this.status === 'ACTIVE' && now >= this.validFrom && now <= this.validTo;
};

module.exports = mongoose.model('Job', jobSchema);