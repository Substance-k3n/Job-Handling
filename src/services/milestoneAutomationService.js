const Milestone = require('../models/Milestone');
const Project = require('../models/Project');

const AUTOMATION_INTERVAL_MS = 60 * 1000;

const closeProjectIfAllMilestonesCompleted = async (projectId) => {
  const totalMilestones = await Milestone.countDocuments({ projectId });

  if (totalMilestones === 0) {
    return false;
  }

  const incompleteMilestones = await Milestone.countDocuments({
    projectId,
    status: { $ne: 'COMPLETED' }
  });

  if (incompleteMilestones !== 0) {
    return false;
  }

  await Project.findByIdAndUpdate(projectId, { status: 'CLOSED' });
  return true;
};

const completeExpiredMilestones = async () => {
  const now = new Date();

  const expiredMilestones = await Milestone.find({
    status: 'IN_PROGRESS',
    endDate: { $lt: now }
  });

  if (expiredMilestones.length === 0) {
    return {
      completedMilestones: 0,
      closedProjects: 0
    };
  }

  const touchedProjectIds = new Set();

  for (const milestone of expiredMilestones) {
    if (!milestone.startDate) {
      milestone.startDate = milestone.endDate;
    }

    milestone.status = 'COMPLETED';
    await milestone.save();
    touchedProjectIds.add(milestone.projectId.toString());
  }

  let closedProjects = 0;
  for (const projectId of touchedProjectIds) {
    const closed = await closeProjectIfAllMilestonesCompleted(projectId);
    if (closed) {
      closedProjects += 1;
    }
  }

  return {
    completedMilestones: expiredMilestones.length,
    closedProjects
  };
};

const startMilestoneAutomation = () => {
  const timer = setInterval(async () => {
    try {
      await completeExpiredMilestones();
    } catch (error) {
      console.error('Milestone automation failed:', error.message);
    }
  }, AUTOMATION_INTERVAL_MS);

  return timer;
};

module.exports = {
  completeExpiredMilestones,
  closeProjectIfAllMilestonesCompleted,
  startMilestoneAutomation,
  AUTOMATION_INTERVAL_MS
};
