const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['short_answer', 'paragraph', 'multiple_choice', 'checkboxes', 'dropdown', 'file', 'rating', 'date', 'time', 'file_upload'],
    required: true, 
  },
  question: {
    type: String,
    required: true
  },
  options: [{
    type: String
  }],
  required: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    required: true
  }
});

const jobFieldSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    unique: true
  },
  fields: [fieldSchema]
}, {
  timestamps: true
});

// Index
jobFieldSchema.index({ jobId: 1 });

module.exports = mongoose.model('JobField', jobFieldSchema);