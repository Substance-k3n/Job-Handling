const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
  moveStage,
  getPipelineStats,
  getStageHistory
} = require('../controllers/pipelineController');
const {
  validateMoveStage,
  validateJobId,
  validateApplicationId
} = require('../validators/pipelineValidator');

// Move application to different stage (Admin only)
/**
 * @swagger
 * /api/applications/{id}/move-stage:
 *   patch:
 *     tags: [Pipeline]
 *     summary: Move application to a different pipeline stage (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stage:
 *                 type: string
 *                 enum: [applied, screening, interview, assessment, offer, hired, rejected]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application moved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Application'
 *       400:
 *         description: Validation or invalid transition
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Application not found
 */
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
 * /api/jobs/{jobId}/pipeline-stats:
 *   get:
 *     tags: [Pipeline]
 *     summary: Get pipeline statistics for a job (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pipeline statistics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 job:
 *                   type: object
 *                 totalApplications:
 *                   type: integer
 *                 pipelineBreakdown:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Job not found
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
 * /api/applications/{id}/stage-history:
 *   get:
 *     tags: [Pipeline]
 *     summary: Get stage history for an application (admin or applicant)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stage history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentStage:
 *                   type: string
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Application not found
 */
router.get(
  '/applications/:id/stage-history',
  protect,
  validateApplicationId,
  validateRequest,
  getStageHistory
);

module.exports = router;