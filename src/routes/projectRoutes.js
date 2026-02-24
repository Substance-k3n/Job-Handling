
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
 * @swagger
 * /admin/projects:
 *   post:
 *     tags: [Projects - Admin]
 *     summary: Create a new project
 *     description: Create a project with an optional image URL and status.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProjectRequest'
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', projectValidator, validateRequest, createProject);

/**
 * @swagger
 * /admin/projects:
 *   get:
 *     tags: [Projects - Admin]
 *     summary: Get all projects
 *     description: Retrieve projects with optional status and search filters.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, BLOCKED, CLOSED]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Projects retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', getAllProjects);

/**
 * @swagger
 * /admin/projects/{projectId}:
 *   get:
 *     tags: [Projects - Admin]
 *     summary: Get project by ID
 *     description: Retrieve a project and its ordered milestones.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project retrieved successfully
 *       404:
 *         description: Project not found
 */
router.get('/:projectId', getProjectById);

/**
 * @swagger
 * /admin/projects/{projectId}:
 *   put:
 *     tags: [Projects - Admin]
 *     summary: Update a project
 *     description: Update project fields including status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProjectRequest'
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Project not found
 */
router.put('/:projectId', updateProject);

/**
 * @swagger
 * /admin/projects/{projectId}:
 *   delete:
 *     tags: [Projects - Admin]
 *     summary: Delete a project
 *     description: Delete a project and all its milestones.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *       404:
 *         description: Project not found
 */
router.delete('/:projectId', deleteProject);

/**
 * @swagger
 * /admin/projects/{projectId}/progress:
 *   get:
 *     tags: [Projects - Admin]
 *     summary: Get project progress
 *     description: Calculate progress based on completed milestones.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progress retrieved successfully
 *       404:
 *         description: Project not found
 */
router.get('/:projectId/progress', getProjectProgress);

/**
 * @swagger
 * /admin/projects/{projectId}/milestones:
 *   post:
 *     tags: [Milestones - Admin]
 *     summary: Add milestone to project
 *     description: Create a milestone as NOT_STARTED. Dates are set when it moves to IN_PROGRESS or COMPLETED.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMilestoneRequest'
 *     responses:
 *       201:
 *         description: Milestone added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MilestoneResponse'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Project not found
 */
router.post('/:projectId/milestones', milestoneValidator, validateRequest, addMilestone);

/**
 * @swagger
 * /admin/projects/{projectId}/milestones/reorder:
 *   patch:
 *     tags: [Milestones - Admin]
 *     summary: Reorder milestones
 *     description: Update milestone order. Orders must be sequential starting from 1.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReorderMilestonesRequest'
 *     responses:
 *       200:
 *         description: Milestones reordered successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Project not found
 */
router.patch('/:projectId/milestones/reorder', reorderMilestones);

module.exports = router;
