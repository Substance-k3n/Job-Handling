
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const { successResponse, errorResponse } = require('../utils/responseUtils');

/**
 * 1. Create Project
 * POST /api/projects
 */
const createProject = async (req, res, next) => {
  try {
    const { name, description, imageUrl, status } = req.body;

    const project = await Project.create({
      name,
      description,
      imageUrl: imageUrl || null,
      status: status || 'ACTIVE',
      createdBy: req.user._id
    });

    return successResponse(res, 201, 'Project created successfully', {
      id: project._id,
      name: project.name,
      description: project.description,
      imageUrl: project.imageUrl,
      status: project.status,
      createdAt: project.createdAt
    });

  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get All Projects
 * GET /api/projects?status=ACTIVE&search=keyword&page=1&limit=10
 */
const getAllProjects = async (req, res, next) => {
  try {
    // Build filter
    const filter = {};

    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status.toUpperCase();
    }

    // Search by name or description
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count
    const totalProjects = await Project.countDocuments(filter);
    const totalPages = Math.ceil(totalProjects / limit);

    // Get projects
    const projects = await Project.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name description imageUrl status createdAt updatedAt');

    // Calculate progress for each project
    const projectsWithProgress = await Promise.all(
      projects.map(async (project) => {
        const progress = await project.calculateProgress();
        return {
          id: project._id,
          name: project.name,
          description: project.description,
          imageUrl: project.imageUrl,
          status: project.status,
          progress,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        };
      })
    );

    return successResponse(res, 200, 'Projects retrieved successfully', {
      projects: projectsWithProgress,
      pagination: {
        currentPage: page,
        totalPages,
        totalProjects,
        projectsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get Single Project with Milestones
 * GET /api/projects/:projectId
 */
const getProjectById = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return errorResponse(res, 404, 'Project not found');
    }

    // Get ordered milestones
    const milestones = await Milestone.find({ projectId })
      .sort({ order: 1 })
      .select('title description order status startDate endDate createdAt updatedAt');

    // Calculate progress
    const progress = await project.calculateProgress();

    return successResponse(res, 200, 'Project retrieved successfully', {
      id: project._id,
      name: project.name,
      description: project.description,
      imageUrl: project.imageUrl,
      status: project.status,
      progress,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      milestones: milestones.map(m => ({
        id: m._id,
        title: m.title,
        description: m.description,
        order: m.order,
        status: m.status,
        startDate: m.startDate,
        endDate: m.endDate,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
      }))
    });

  } catch (error) {
    next(error);
  }
};

/**
 * 4. Update Project
 * PUT /api/projects/:projectId
 */
const updateProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, description, imageUrl, status } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return errorResponse(res, 404, 'Project not found');
    }

    // Validate status
    if (status && !['ACTIVE', 'BLOCKED', 'CLOSED'].includes(status)) {
      return errorResponse(res, 400, 'Invalid status. Must be ACTIVE, BLOCKED, or CLOSED');
    }

    // Rule: If setting to CLOSED, all milestones must be COMPLETED
    if (status === 'CLOSED') {
      const incompleteMilestones = await Milestone.countDocuments({
        projectId,
        status: { $ne: 'COMPLETED' }
      });

      if (incompleteMilestones > 0) {
        return errorResponse(res, 400, 'Cannot close project with incomplete milestones');
      }
    }

    // Update fields
    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (imageUrl !== undefined) project.imageUrl = imageUrl;
    if (status !== undefined) project.status = status;

    await project.save();

    return successResponse(res, 200, 'Project updated successfully', {
      id: project._id,
      name: project.name,
      description: project.description,
      imageUrl: project.imageUrl,
      status: project.status,
      updatedAt: project.updatedAt
    });

  } catch (error) {
    next(error);
  }
};

/**
 * 5. Delete Project
 * DELETE /api/projects/:projectId
 */
const deleteProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findByIdAndDelete(projectId);
    if (!project) {
      return errorResponse(res, 404, 'Project not found');
    }

    // Delete all milestones
    await Milestone.deleteMany({ projectId });

    return successResponse(res, 200, 'Project deleted successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * Get Project Progress
 * GET /api/projects/:projectId/progress
 */
const getProjectProgress = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return errorResponse(res, 404, 'Project not found');
    }

    const progress = await project.calculateProgress();

    const totalMilestones = await Milestone.countDocuments({ projectId });
    const completedMilestones = await Milestone.countDocuments({ 
      projectId, 
      status: 'COMPLETED' 
    });
    const inProgressMilestones = await Milestone.countDocuments({ 
      projectId, 
      status: 'IN_PROGRESS' 
    });

    return successResponse(res, 200, 'Project progress retrieved successfully', {
      projectId: project._id,
      projectName: project.name,
      progress,
      totalMilestones,
      completedMilestones,
      inProgressMilestones,
      notStartedMilestones: totalMilestones - completedMilestones - inProgressMilestones
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectProgress
};