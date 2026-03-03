
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
  getProjectProgress,
} = require('../controllers/projectController');

const {
  addMilestone,
  reorderMilestones
} = require('../controllers/milestoneController');

const requireAdmin = [protect, authorize('admin', 'super_admin')];

/**
 * @swagger
 * /projects:
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
router.post('/', ...requireAdmin, projectValidator, validateRequest, createProject);

/**
 * @swagger
 * /projects:
 *   get:
 *     tags: [Projects - Public]
 *     summary: Get all projects (PUBLIC)
 *     description: Retrieve projects with optional status and search filters without authentication.
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
 */
router.get('/', getAllProjects);

/**
 * @swagger
 * /projects/{projectId}:
 *   get:
 *     tags: [Projects - Public]
 *     summary: Get project by ID (PUBLIC)
 *     description: Retrieve a project and its ordered milestones for frontend workflow.
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
 * /projects/{projectId}:
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
router.put('/:projectId', ...requireAdmin, updateProject);

/**
 * @swagger
 * /projects/{projectId}:
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
router.delete('/:projectId', ...requireAdmin, deleteProject);

/**
 * @swagger
 * /projects/{projectId}/progress:
 *   get:
 *     tags: [Projects - Public]
 *     summary: Get project progress (PUBLIC)
 *     description: Calculate progress based on completed milestones without authentication.
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
 * /projects/{projectId}/milestones:
 *   post:
 *     tags: [Milestones - Admin]
 *     summary: Add milestone to project
 *     description: Create a milestone as NOT_STARTED with order assigned automatically. startDate and endDate are NOT created here; they must be sent later through the milestone status PATCH endpoint.
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
 *             examples:
 *               createdMilestone:
 *                 summary: New milestone created (no dates yet)
 *                 value:
 *                   success: true
 *                   message: Milestone added successfully
 *                   data:
 *                     id: 67c4c4a0f5a3a2d9f3531001
 *                     projectId: 67c4c45df5a3a2d9f3530fff
 *                     title: Design phase
 *                     description: Wireframes and mockups
 *                     order: 1
 *                     status: NOT_STARTED
 *                     startDate: null
 *                     endDate: null
 *                     createdAt: '2026-03-03T10:15:00.000Z'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Project not found
 */
router.post('/:projectId/milestones', ...requireAdmin, milestoneValidator, validateRequest, addMilestone);

/**
 * @swagger
 * /projects/{projectId}/milestones/reorder:
 *   patch:
 *     tags: [Milestones - Admin]
 *     summary: Reorder milestones
 *     description: Update milestone order manually. Orders must be sequential starting from 1.
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
router.patch('/:projectId/milestones/reorder', ...requireAdmin, reorderMilestones);

module.exports = router;
