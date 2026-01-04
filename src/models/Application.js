const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  applicant: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    }
  },
  answers: [{
    fieldId: {
      type: String,
      required: true
    },
    value: mongoose.Schema.Types.Mixed
  }],
  isSaved: {
    type: Boolean,
    default: false,
    index: true
  },
  isInvited: {
    type: Boolean,
    default: false,
    index: true
  },
  isAccepted: {
    type: Boolean,
    default: false,
    index: true
  },
  interviewDetails: {
    date: Date,
    time: String,
    meetLink: String
  }
}, {
  timestamps: true
});

applicationSchema.index({ jobId: 1, 'applicant.email': 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);