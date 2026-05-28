const Project = require('../models/Project');
const Milestone = require('../models/Milestone');

const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalProjects,
      activeProjects,
      completedProjects,
      overdueMilestones,
      allProjects
    ] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: { $in: ['active', 'ACTIVE'] } }),
      Project.countDocuments({ status: { $in: ['completed', 'CLOSED'] } }),
      Milestone.countDocuments({ status: 'overdue' }),
      Project.find().lean()
    ]);

    let totalProgress = 0;
    if (allProjects.length > 0) {
      const progressValues = await Promise.all(
        allProjects.map(async (project) => {
          if (project.progress != null) return project.progress;
          const [total, done] = await Promise.all([
            Milestone.countDocuments({ projectId: project._id }),
            Milestone.countDocuments({ projectId: project._id, status: { $in: ['COMPLETED', 'completed'] } })
          ]);
          return total > 0 ? Math.round((done / total) * 100) : 0;
        })
      );
      totalProgress = progressValues.reduce((sum, p) => sum + p, 0);
    }

    const averageProgress = allProjects.length > 0
      ? Math.round(totalProgress / allProjects.length)
      : 0;

    return res.status(200).json({
      totalProjects,
      activeProjects,
      completedProjects,
      overdueMilestones,
      averageProgress
    });
  } catch (error) {
    next(error);
  }
};

const getActivity = async (req, res, next) => {
  try {
    const [recentProjects, recentMilestones] = await Promise.all([
      Project.find().sort({ updatedAt: -1 }).limit(5).lean(),
      Milestone.find({ status: { $in: ['completed', 'COMPLETED', 'overdue'] } })
        .sort({ updatedAt: -1 }).limit(5).lean()
    ]);

    const activity = [];

    for (const project of recentProjects) {
      activity.push({
        id: `project-${project._id}`,
        title: 'Project updated',
        description: `${project.title || project.name} was updated.`,
        type: 'project',
        createdAt: project.updatedAt
      });
    }

    for (const milestone of recentMilestones) {
      const isCompleted = milestone.status === 'completed' || milestone.status === 'COMPLETED';
      activity.push({
        id: `milestone-${milestone._id}`,
        title: isCompleted ? 'Milestone completed' : 'Milestone overdue',
        description: `"${milestone.title}" ${isCompleted ? 'was completed' : 'is overdue'}.`,
        type: 'milestone',
        createdAt: milestone.updatedAt
      });
    }

    activity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json(activity.slice(0, 10));
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats, getActivity };
