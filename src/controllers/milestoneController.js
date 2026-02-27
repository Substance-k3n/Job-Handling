
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const { successResponse, errorResponse } = require('../utils/responseUtils');

const addMilestone = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, description } = req.body;

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return errorResponse(res, 404, 'Project not found');
    }

    // Get next order number
    const nextOrder = await Milestone.getNextOrder(projectId);

    // Create milestone
    const milestone = await Milestone.create({
      projectId,
      title,
      description: description || null,
      order: nextOrder,
      status: 'NOT_STARTED',
      startDate: null,
      endDate: null
    });

    return successResponse(res, 201, 'Milestone added successfully', {
      id: milestone._id,
      projectId: milestone.projectId,
      title: milestone.title,
      description: milestone.description,
      order: milestone.order,
      status: milestone.status,
      startDate: milestone.startDate,
      endDate: milestone.endDate,
      createdAt: milestone.createdAt
    });

  } catch (error) {
    next(error);
  }
};

/**
 * 7. Update Milestone (title/description only)
 * PUT /api/milestones/:milestoneId
 */
const updateMilestone = async (req, res, next) => {
  try {
    const { milestoneId } = req.params;
    const { title, description } = req.body;

    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) {
      return errorResponse(res, 404, 'Milestone not found');
    }

    // Update only title and description
    if (title !== undefined) milestone.title = title;
    if (description !== undefined) milestone.description = description;

    await milestone.save();

    return successResponse(res, 200, 'Milestone updated successfully', {
      id: milestone._id,
      title: milestone.title,
      description: milestone.description,
      order: milestone.order,
      status: milestone.status,
      startDate: milestone.startDate,
      endDate: milestone.endDate,
      updatedAt: milestone.updatedAt
    });

  } catch (error) {
    next(error);
  }
};

/**
 * 8. Update Milestone Status
 * PATCH /api/milestones/:milestoneId/status
 */
const updateMilestoneStatus = async (req, res, next) => {
  try {
    const { milestoneId } = req.params;
    const { status, startDate, endDate } = req.body;

    // Validate status
    if (!['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      return errorResponse(res, 400, 'Invalid status');
    }

    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) {
      return errorResponse(res, 404, 'Milestone not found');
    }

    // Rule: Can only complete a milestone that is IN_PROGRESS
    if (status === 'COMPLETED' && milestone.status !== 'IN_PROGRESS') {
      return errorResponse(res, 400, 'Can only complete a milestone that is in progress');
    }

    // Manual date logic:
    // - when moving to IN_PROGRESS, require startDate and endDate
    // - when moving to COMPLETED, allow endDate to stay or be increased
    if (status === 'NOT_STARTED') {
      if (startDate || endDate) {
        return errorResponse(res, 400, 'Dates can only be set when a milestone is in progress or completed');
      }
    }

    if (status === 'IN_PROGRESS') {
      if (!startDate || !endDate) {
        return errorResponse(res, 400, 'startDate and endDate are required when moving a milestone to IN_PROGRESS');
      }

      if (milestone.startDate && startDate && new Date(startDate).getTime() !== milestone.startDate.getTime()) {
        return errorResponse(res, 400, 'startDate is already set and cannot be changed');
      }

      if (milestone.endDate && new Date(endDate) < milestone.endDate) {
        return errorResponse(res, 400, 'endDate can only be increased');
      }

      milestone.startDate = milestone.startDate || new Date(startDate);
      milestone.endDate = new Date(endDate);
    }

    if (status === 'COMPLETED') {
      if (!milestone.startDate) {
        return errorResponse(res, 400, 'startDate must be set before completing a milestone');
      }

      if (endDate) {
        if (milestone.endDate && new Date(endDate) < milestone.endDate) {
          return errorResponse(res, 400, 'endDate can only be increased');
        }
        milestone.endDate = new Date(endDate);
      }
    }

    if (milestone.startDate && milestone.endDate && milestone.endDate < milestone.startDate) {
      return errorResponse(res, 400, 'endDate must be on or after startDate');
    }

    // Update status (pre-save hook will validate other rules)
    milestone.status = status;

    try {
      await milestone.save();
    } catch (validationError) {
      return errorResponse(res, 400, validationError.message);
    }

    return successResponse(res, 200, 'Milestone status updated successfully', {
      id: milestone._id,
      title: milestone.title,
      order: milestone.order,
      status: milestone.status,
      startDate: milestone.startDate,
      endDate: milestone.endDate,
      updatedAt: milestone.updatedAt
    });

  } catch (error) {
    next(error);
  }
};

/**
 * 9. Delete Milestone
 * DELETE /api/milestones/:milestoneId
 */
const deleteMilestone = async (req, res, next) => {
  try {
    const { milestoneId } = req.params;

    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) {
      return errorResponse(res, 404, 'Milestone not found');
    }

    const { projectId, order } = milestone;

    // Delete milestone
    await Milestone.findByIdAndDelete(milestoneId);

    // Reorder remaining milestones
    await Milestone.reorderAfterDeletion(projectId, order);

    return successResponse(res, 200, 'Milestone deleted successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * 10. Reorder Milestones
 * PATCH /api/projects/:projectId/milestones/reorder
 */
const reorderMilestones = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { milestones } = req.body;

    if (!Array.isArray(milestones) || milestones.length === 0) {
      return errorResponse(res, 400, 'Milestones array is required');
    }

    // Validate all milestones belong to this project
    const milestoneIds = milestones.map(m => m.id);
    const existingMilestones = await Milestone.find({
      _id: { $in: milestoneIds },
      projectId
    });

    if (existingMilestones.length !== milestones.length) {
      return errorResponse(res, 400, 'Some milestones do not belong to this project');
    }

    // Validate no duplicate orders
    const orders = milestones.map(m => m.order);
    if (new Set(orders).size !== orders.length) {
      return errorResponse(res, 400, 'Duplicate order numbers detected');
    }

    // Validate no gaps in order (must be 1,2,3,...)
    const sortedOrders = [...orders].sort((a, b) => a - b);
    for (let i = 0; i < sortedOrders.length; i++) {
      if (sortedOrders[i] !== i + 1) {
        return errorResponse(res, 400, 'Order numbers must be sequential starting from 1');
      }
    }

    // Update all milestones
    await Promise.all(
      milestones.map(({ id, order }) =>
        Milestone.findByIdAndUpdate(id, { order })
      )
    );

    return successResponse(res, 200, 'Milestones reordered successfully');

  } catch (error) {
    next(error);
  }
};

module.exports = {
  addMilestone,
  updateMilestone,
  updateMilestoneStatus,
  deleteMilestone,
  reorderMilestones
};