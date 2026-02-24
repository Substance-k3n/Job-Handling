
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { projectValidator, milestoneValidator } = require('../validators/projectValidator');
const validateRequest = require('../middleware/validateRequest');

const {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectProgress
} = require('../controllers/projectController');

const {
  addMilestone,
  updateMilestone,
  updateMilestoneStatus,
  deleteMilestone,
  reorderMilestones
} = require('../controllers/milestoneController');

// Apply authentication and authorization
router.use(protect);
router.use(authorize('admin', 'super_admin'));

/**
 * @route   POST /api/admin/projects
 * @desc    Create a new project
 * @access  Admin only
 */
router.post('/', projectValidator, validateRequest, createProject);

/**
 * @route   GET /api/admin/projects
 * @desc    Get all projects (with filters and pagination)
 * @access  Admin only
 * @query   status, search, page, limit
 */
router.get('/', getAllProjects);

/**
 * @route   GET /api/admin/projects/:projectId
 * @desc    Get single project with ordered milestones
 * @access  Admin only
 */
router.get('/:projectId', getProjectById);

/**
 * @route   PUT /api/admin/projects/:projectId
 * @desc    Update project
 * @access  Admin only
 */
router.put('/:projectId', updateProject);

/**
 * @route   DELETE /api/admin/projects/:projectId
 * @desc    Delete project and all its milestones
 * @access  Admin only
 */
router.delete('/:projectId', deleteProject);

/**
 * @route   GET /api/admin/projects/:projectId/progress
 * @desc    Get project progress
 * @access  Admin only
 */
router.get('/:projectId/progress', getProjectProgress);

/**
 * @route   POST /api/admin/projects/:projectId/milestones
 * @desc    Add milestone to project
 * @access  Admin only
 */
router.post('/:projectId/milestones', milestoneValidator, validateRequest, addMilestone);

/**
 * @route   PATCH /api/admin/projects/:projectId/milestones/reorder
 * @desc    Reorder milestones
 * @access  Admin only
 */
router.patch('/:projectId/milestones/reorder', reorderMilestones);

module.exports = router;
