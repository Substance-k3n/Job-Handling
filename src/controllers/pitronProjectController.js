const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const { successResponse, errorResponse } = require('../utils/responseUtils');

function formatProject(project, milestoneCount, completedMilestones, progress) {
  return {
    _id: project._id,
    title: project.title || project.name || '',
    description: project.description,
    banner: project.banner || project.imageUrl || null,
    media: project.media || [],
    startDate: project.startDate || null,
    endDate: project.endDate || null,
    budget: project.budget || null,
    status: project.status,
    milestoneCount: milestoneCount ?? 0,
    completedMilestones: completedMilestones ?? 0,
    progress: progress ?? 0,
    teamIds: project.teamIds || [],
    memberIds: project.memberIds || [],
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}

const getAllAdminProjects = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const [projects, total] = await Promise.all([
      Project.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(parseInt(limit)),
      Project.countDocuments(filter)
    ]);

    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const [milestoneCount, completedMilestones] = await Promise.all([
          Milestone.countDocuments({ projectId: project._id }),
          Milestone.countDocuments({ projectId: project._id, status: { $in: ['COMPLETED', 'completed'] } })
        ]);
        const progress = project.progress ?? (milestoneCount > 0
          ? Math.round((completedMilestones / milestoneCount) * 100)
          : 0);
        return formatProject(project, milestoneCount, completedMilestones, progress);
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Projects retrieved successfully',
      data: projectsWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAdminProjectById = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return errorResponse(res, 404, 'Project not found');

    const milestones = await Milestone.find({ projectId: project._id }).sort({ order: 1, createdAt: 1 });

    const [milestoneCount, completedMilestones] = await Promise.all([
      Milestone.countDocuments({ projectId: project._id }),
      Milestone.countDocuments({ projectId: project._id, status: { $in: ['COMPLETED', 'completed'] } })
    ]);

    const progress = project.progress ?? (milestoneCount > 0
      ? Math.round((completedMilestones / milestoneCount) * 100)
      : 0);

    const projectData = formatProject(project, milestoneCount, completedMilestones, progress);
    projectData.milestones = milestones.map(formatMilestone);

    return successResponse(res, 200, 'Project retrieved successfully', projectData);
  } catch (error) {
    next(error);
  }
};

const createAdminProject = async (req, res, next) => {
  try {
    const { title, description, banner, media, startDate, endDate, budget, status, progress, teamIds, memberIds } = req.body;

    if (!title) return errorResponse(res, 400, 'title is required');
    if (!description) return errorResponse(res, 400, 'description is required');

    const project = await Project.create({
      title,
      name: title,
      description,
      banner: banner || null,
      media: media || [],
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      budget: budget ?? null,
      status: status || 'active',
      progress: progress ?? null,
      teamIds: teamIds || [],
      memberIds: memberIds || [],
      createdBy: req.user?._id || null
    });

    return successResponse(res, 201, 'Project created successfully',
      formatProject(project, 0, 0, project.progress ?? 0));
  } catch (error) {
    next(error);
  }
};

const updateAdminProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, description, banner, media, startDate, endDate, budget, status, progress, teamIds, memberIds } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return errorResponse(res, 404, 'Project not found');

    if (title !== undefined) { project.title = title; project.name = title; }
    if (description !== undefined) project.description = description;
    if (banner !== undefined) project.banner = banner;
    if (media !== undefined) project.media = media;
    if (startDate !== undefined) project.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) project.endDate = endDate ? new Date(endDate) : null;
    if (budget !== undefined) project.budget = budget;
    if (status !== undefined) project.status = status;
    if (progress !== undefined) project.progress = progress;
    if (teamIds !== undefined) project.teamIds = teamIds;
    if (memberIds !== undefined) project.memberIds = memberIds;

    await project.save();

    const [milestoneCount, completedMilestones] = await Promise.all([
      Milestone.countDocuments({ projectId: project._id }),
      Milestone.countDocuments({ projectId: project._id, status: { $in: ['COMPLETED', 'completed'] } })
    ]);
    const computedProgress = project.progress ?? (milestoneCount > 0
      ? Math.round((completedMilestones / milestoneCount) * 100)
      : 0);

    const milestones = await Milestone.find({ projectId: project._id }).sort({ order: 1, createdAt: 1 });
    const projectData = formatProject(project, milestoneCount, completedMilestones, computedProgress);
    projectData.milestones = milestones.map(formatMilestone);

    return successResponse(res, 200, 'Project updated successfully', projectData);
  } catch (error) {
    next(error);
  }
};

const deleteAdminProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findByIdAndDelete(projectId);
    if (!project) return errorResponse(res, 404, 'Project not found');

    await Milestone.deleteMany({ projectId });

    return successResponse(res, 200, 'Project deleted successfully');
  } catch (error) {
    next(error);
  }
};

const getAdminProjectProgress = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return errorResponse(res, 404, 'Project not found');

    const [milestoneCount, completedMilestones] = await Promise.all([
      Milestone.countDocuments({ projectId: project._id }),
      Milestone.countDocuments({ projectId: project._id, status: { $in: ['COMPLETED', 'completed'] } })
    ]);

    const progress = project.progress ?? (milestoneCount > 0
      ? Math.round((completedMilestones / milestoneCount) * 100)
      : 0);

    return successResponse(res, 200, 'Progress retrieved successfully', {
      _id: project._id,
      title: project.title || project.name,
      progress,
      milestoneCount,
      completedMilestones
    });
  } catch (error) {
    next(error);
  }
};

function formatMilestone(milestone) {
  return {
    _id: milestone._id,
    projectId: milestone.projectId,
    title: milestone.title,
    description: milestone.description || null,
    dueDate: milestone.dueDate || milestone.endDate || null,
    status: milestone.status,
    progress: milestone.progress ?? 0,
    priority: milestone.priority || 'medium'
  };
}

module.exports = {
  getAllAdminProjects,
  getAdminProjectById,
  createAdminProject,
  updateAdminProject,
  deleteAdminProject,
  getAdminProjectProgress,
  formatMilestone
};
