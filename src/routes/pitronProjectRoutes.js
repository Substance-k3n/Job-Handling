const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const {
  getAllAdminProjects,
  getAdminProjectById,
  createAdminProject,
  updateAdminProject,
  deleteAdminProject,
  getAdminProjectProgress
} = require('../controllers/pitronProjectController');

const {
  getProjectMilestones,
  createProjectMilestone,
  updateProjectMilestone,
  startProjectMilestone,
  completeProjectMilestone,
  deleteProjectMilestone
} = require('../controllers/pitronMilestoneController');

const requireAdmin = [protect, authorize('admin', 'super_admin')];

// ─── Project routes ───────────────────────────────────────────────────────────

router.get('/', ...requireAdmin, getAllAdminProjects);
router.post('/', ...requireAdmin, createAdminProject);
router.get('/:projectId', ...requireAdmin, getAdminProjectById);
router.patch('/:projectId', ...requireAdmin, updateAdminProject);
router.delete('/:projectId', ...requireAdmin, deleteAdminProject);
router.get('/:projectId/progress', ...requireAdmin, getAdminProjectProgress);

// ─── Nested milestone routes ──────────────────────────────────────────────────

router.get('/:projectId/milestones', ...requireAdmin, getProjectMilestones);
router.post('/:projectId/milestones', ...requireAdmin, createProjectMilestone);
router.patch('/:projectId/milestones/:milestoneId', ...requireAdmin, updateProjectMilestone);
router.patch('/:projectId/milestones/:milestoneId/start', ...requireAdmin, startProjectMilestone);
router.patch('/:projectId/milestones/:milestoneId/complete', ...requireAdmin, completeProjectMilestone);
router.delete('/:projectId/milestones/:milestoneId', ...requireAdmin, deleteProjectMilestone);

module.exports = router;
