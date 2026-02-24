
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
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
  status: {
    type: String,
    enum: ['ACTIVE', 'BLOCKED', 'CLOSED'],
    default: 'ACTIVE',
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required']
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
  if (totalMilestones === 0) return 0;
  
  const completedMilestones = await Milestone.countDocuments({ 
    projectId: this._id, 
    status: 'COMPLETED' 
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