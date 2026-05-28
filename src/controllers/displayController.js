const Project = require('../models/Project');
const Milestone = require('../models/Milestone');

function mapMilestoneStatusForDisplay(status) {
  const map = {
    'in_progress': 'in-progress',
    'IN_PROGRESS': 'in-progress',
    'pending': 'in-progress',
    'NOT_STARTED': 'in-progress',
    'completed': 'completed',
    'COMPLETED': 'completed',
    'overdue': 'overdue',
    'on_hold': 'in-progress',
    'BLOCKED': 'in-progress'
  };
  return map[status] || 'in-progress';
}

const getDisplayProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({
      status: { $in: ['active', 'ACTIVE', 'in_progress', 'planning', 'completed', 'on_hold', 'on-hold'] }
    }).sort({ createdAt: -1 });

    const result = await Promise.all(
      projects.map(async (project) => {
        const milestones = await Milestone.find({ projectId: project._id })
          .sort({ order: 1, createdAt: 1 });

        const [milestoneCount, completedCount] = await Promise.all([
          Milestone.countDocuments({ projectId: project._id }),
          Milestone.countDocuments({ projectId: project._id, status: { $in: ['COMPLETED', 'completed'] } })
        ]);

        const progress = project.progress ?? (milestoneCount > 0
          ? Math.round((completedCount / milestoneCount) * 100)
          : 0);

        return {
          id: project._id.toString(),
          title: project.title || project.name || '',
          description: project.description,
          banner: project.banner || project.imageUrl || '',
          media: project.media || [],
          status: project.status,
          progress,
          startDate: project.startDate ? project.startDate.toISOString().split('T')[0] : '',
          endDate: project.endDate ? project.endDate.toISOString().split('T')[0] : '',
          teamIds: project.teamIds || [],
          memberIds: project.memberIds || [],
          milestones: milestones.map((m) => ({
            id: m._id.toString(),
            title: m.title,
            status: mapMilestoneStatusForDisplay(m.status),
            startDate: m.startDate ? m.startDate.toISOString().split('T')[0] : undefined,
            dueDate: (m.dueDate || m.endDate)
              ? (m.dueDate || m.endDate).toISOString().split('T')[0]
              : '',
            teamId: null,
            projectId: project._id.toString()
          }))
        };
      })
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { getDisplayProjects };
