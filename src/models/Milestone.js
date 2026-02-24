const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Milestone title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    default: null
  },
  order: {
    type: Number,
    required: [true, 'Order is required'],
    min: [1, 'Order must be at least 1']
  },
  status: {
    type: String,
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
    default: 'NOT_STARTED',
    index: true
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

/**
 * Compound index to ensure unique order per project
 */
milestoneSchema.index({ projectId: 1, order: 1 }, { unique: true });

/**
 * Pre-save hook to validate milestone status rules
 */
milestoneSchema.pre('save', async function(next) {
  // Only validate if status is being modified
  if (!this.isModified('status')) {
    return next();
  }

  // Get the project to check its status
  const Project = mongoose.model('Project');
  const project = await Project.findById(this.projectId);
  
  if (!project) {
    return next(new Error('Project not found'));
  }

  // Rule: Cannot set milestone to IN_PROGRESS if project is BLOCKED
  if (this.status === 'IN_PROGRESS' && project.status === 'BLOCKED') {
    return next(new Error('Cannot start milestone while project is BLOCKED'));
  }

  // Rule: Only one milestone can be IN_PROGRESS at a time
  if (this.status === 'IN_PROGRESS') {
    const existingInProgress = await this.constructor.findOne({
      projectId: this.projectId,
      status: 'IN_PROGRESS',
      _id: { $ne: this._id }
    });
    
    if (existingInProgress) {
      return next(new Error('Another milestone is already in progress'));
    }

    // Rule: All previous milestones must be COMPLETED
    const previousMilestones = await this.constructor.find({
      projectId: this.projectId,
      order: { $lt: this.order }
    });

    const allPreviousCompleted = previousMilestones.every(m => m.status === 'COMPLETED');
    if (!allPreviousCompleted) {
      return next(new Error('All previous milestones must be completed first'));
    }
  }

  next();
});

/**
 * Static method to get next order number for a project
 */
milestoneSchema.statics.getNextOrder = async function(projectId) {
  const lastMilestone = await this.findOne({ projectId })
    .sort({ order: -1 })
    .select('order');
  
  return lastMilestone ? lastMilestone.order + 1 : 1;
};

/**
 * Static method to reorder milestones after deletion
 */
milestoneSchema.statics.reorderAfterDeletion = async function(projectId, deletedOrder) {
  // Update all milestones with order greater than deleted order
  await this.updateMany(
    { projectId, order: { $gt: deletedOrder } },
    { $inc: { order: -1 } }
  );
};

module.exports = mongoose.model('Milestone', milestoneSchema);