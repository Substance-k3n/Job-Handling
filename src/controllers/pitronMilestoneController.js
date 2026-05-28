const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const { formatMilestone } = require('./pitronProjectController');

const getProjectMilestones = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return errorResponse(res, 404, 'Project not found');

    const milestones = await Milestone.find({ projectId }).sort({ order: 1, createdAt: 1 });

    return successResponse(res, 200, 'Milestones retrieved successfully',
      milestones.map(formatMilestone));
  } catch (error) {
    next(error);
  }
};

const createProjectMilestone = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, description, dueDate, status, priority, progress } = req.body;

    if (!title) return errorResponse(res, 400, 'title is required');

    const project = await Project.findById(projectId);
    if (!project) return errorResponse(res, 404, 'Project not found');

    const nextOrder = await Milestone.getNextOrder(projectId);

    const milestone = await Milestone.create({
      projectId,
      title,
      description: description || null,
      order: nextOrder,
      status: status || 'pending',
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || 'medium',
      progress: progress ?? 0
    });

    return successResponse(res, 201, 'Milestone created successfully', formatMilestone(milestone));
  } catch (error) {
    next(error);
  }
};

const updateProjectMilestone = async (req, res, next) => {
  try {
    const { projectId, milestoneId } = req.params;
    const { title, description, dueDate, status, priority, progress } = req.body;

    const milestone = await Milestone.findOne({ _id: milestoneId, projectId });
    if (!milestone) return errorResponse(res, 404, 'Milestone not found');

    if (title !== undefined) milestone.title = title;
    if (description !== undefined) milestone.description = description;
    if (dueDate !== undefined) milestone.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) milestone.status = status;
    if (priority !== undefined) milestone.priority = priority;
    if (progress !== undefined) milestone.progress = progress;

    await milestone.save();

    return successResponse(res, 200, 'Milestone updated successfully', formatMilestone(milestone));
  } catch (error) {
    next(error);
  }
};

const startProjectMilestone = async (req, res, next) => {
  try {
    const { projectId, milestoneId } = req.params;

    const milestone = await Milestone.findOne({ _id: milestoneId, projectId });
    if (!milestone) return errorResponse(res, 404, 'Milestone not found');

    milestone.status = 'in_progress';
    await milestone.save();

    return successResponse(res, 200, 'Milestone started', formatMilestone(milestone));
  } catch (error) {
    next(error);
  }
};

const completeProjectMilestone = async (req, res, next) => {
  try {
    const { projectId, milestoneId } = req.params;

    const milestone = await Milestone.findOne({ _id: milestoneId, projectId });
    if (!milestone) return errorResponse(res, 404, 'Milestone not found');

    milestone.status = 'completed';
    milestone.progress = 100;
    await milestone.save();

    return successResponse(res, 200, 'Milestone completed', formatMilestone(milestone));
  } catch (error) {
    next(error);
  }
};

const deleteProjectMilestone = async (req, res, next) => {
  try {
    const { projectId, milestoneId } = req.params;

    const milestone = await Milestone.findOneAndDelete({ _id: milestoneId, projectId });
    if (!milestone) return errorResponse(res, 404, 'Milestone not found');

    await Milestone.reorderAfterDeletion(projectId, milestone.order);

    return successResponse(res, 200, 'Milestone deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjectMilestones,
  createProjectMilestone,
  updateProjectMilestone,
  startProjectMilestone,
  completeProjectMilestone,
  deleteProjectMilestone
};
