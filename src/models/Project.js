
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  // pitron-showcase field (frontend uses "title")
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true,
    default: null
  },
  // pitron-showcase fields
  banner: {
    type: String,
    trim: true,
    default: null
  },
  media: [{
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    src: { type: String, trim: true },
    alt: { type: String, trim: true },
    label: { type: String, trim: true },
    poster: { type: String, trim: true }
  }],
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  budget: {
    type: Number,
    default: null
  },
  teamIds: [{ type: String }],
  memberIds: [{ type: String }],
  // Manual progress override (0-100); computed from milestones if not set
  progress: {
    type: Number,
    default: null,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: [
      'ACTIVE', 'BLOCKED', 'CLOSED',
      'active', 'completed', 'on-hold', 'planning', 'on_hold', 'cancelled'
    ],
    default: 'ACTIVE',
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

/**
 * Calculate project progress based on completed milestones
 */
projectSchema.methods.calculateProgress = async function() {
  const Milestone = mongoose.model('Milestone');

  const totalMilestones = await Milestone.countDocuments({ projectId: this._id });
  if (totalMilestones === 0) return this.progress ?? 0;

  const completedMilestones = await Milestone.countDocuments({
    projectId: this._id,
    status: { $in: ['COMPLETED', 'completed'] }
  });

  return Math.round((completedMilestones / totalMilestones) * 100);
};

/**
 * Virtual for getting milestones
 */
projectSchema.virtual('milestones', {
  ref: 'Milestone',
  localField: '_id',
  foreignField: 'projectId'
});

/**
 * Indexes for efficient querying
 */
projectSchema.index({ status: 1, createdAt: -1 });
projectSchema.index({ name: 'text', description: 'text' }); // For search

module.exports = mongoose.model('Project', projectSchema);
