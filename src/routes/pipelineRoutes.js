/**
 * @swagger
 * tags:
 *   - name: Pipeline
 *     description: Pipeline and application stage management
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * @swagger
 * /api/pipeline/applications/{id}/move-stage:
 *   patch:
 *     summary: Move an application to a different pipeline stage
 *     tags: [Pipeline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [stage]
 *             properties:
 *               stage:
 *                 type: string
 *                 description: Target stage ID or name
 *               notes:
 *                 type: string
 *                 description: Optional admin notes about the move
 *     responses:
 *       200:
 *         description: Application moved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
const validateRequest = require('../middleware/validateRequest');
const captureMetadata = require('../middleware/captureMetadata');
const {
  moveStage,
  getPipelineStats,
  getStageHistory,
  getKanbanBoard
} = require('../controllers/pipelineController');
const {
  validateMoveStage,
  validateJobId,
  validateApplicationId
} = require('../validators/pipelineValidator');

// Apply metadata capture to all routes
router.use(captureMetadata);

// Move application to different stage (Admin only)
router.patch(
  '/applications/:id/move-stage',
  protect,
  authorize('admin'),
  validateMoveStage,
  validateRequest,
  moveStage
);

// Get pipeline statistics for a job (Admin only)
/**
 * @swagger
 * /api/pipeline/jobs/{jobId}/pipeline-stats:
 *   get:
 *     summary: Get pipeline statistics for a job
 *     tags: [Pipeline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Pipeline statistics retrieved
 *       400:
 *         description: Invalid job ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/jobs/:jobId/pipeline-stats',
  protect,
  authorize('admin'),
  validateJobId,
  validateRequest,
  getPipelineStats
);

// Get stage history for an application (Admin or Applicant)
/**
 * @swagger
 * /api/pipeline/applications/{id}/stage-history:
 *   get:
 *     summary: Get stage history for an application
 *     tags: [Pipeline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Stage history retrieved
 *       400:
 *         description: Invalid application ID
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/applications/:id/stage-history',
  protect,
  validateApplicationId,
  validateRequest,
  getStageHistory
);

// Get Kanban board view (Admin only)
/**
 * @swagger
 * /api/pipeline/applications/pipeline:
 *   get:
 *     summary: Get Kanban board view for applications
 *     tags: [Pipeline]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kanban board data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/applications/pipeline',
  protect,
  authorize('admin'),
  getKanbanBoard
);

module.exports = router;