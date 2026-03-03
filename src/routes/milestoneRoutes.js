
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const {
  updateMilestone,
  updateMilestoneStatus,
  deleteMilestone
} = require('../controllers/milestoneController');

// Apply authentication and authorization
router.use(protect);
router.use(authorize('admin', 'super_admin'));

/**
 * @swagger
 * /admin/milestones/{milestoneId}:
 *   put:
 *     tags: [Milestones - Admin]
 *     summary: Update milestone
 *     description: Update milestone title and description only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: milestoneId
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
 *       200:
 *         description: Milestone updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MilestoneResponse'
 *       404:
 *         description: Milestone not found
 */
router.put('/:milestoneId', updateMilestone);

/**
 * @swagger
 * /admin/milestones/{milestoneId}/status:
 *   patch:
 *     tags: [Milestones - Admin]
 *     summary: Update milestone status
 *     description: When moving to IN_PROGRESS, you must provide startDate and endDate. startDate cannot be changed later, while endDate can be increased. When moving to COMPLETED, endDate is required and startDate must already exist (or be provided if missing). Milestones in IN_PROGRESS are automatically marked COMPLETED once endDate passes.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMilestoneStatusRequest'
 *     responses:
 *       200:
 *         description: Milestone status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MilestoneResponse'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Milestone not found
 */
router.patch('/:milestoneId/status', updateMilestoneStatus);

/**
 * @swagger
 * /admin/milestones/{milestoneId}:
 *   delete:
 *     tags: [Milestones - Admin]
 *     summary: Delete milestone
 *     description: Delete a milestone and reorder remaining milestones.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Milestone deleted successfully
 *       404:
 *         description: Milestone not found
 */
router.delete('/:milestoneId', deleteMilestone);

module.exports = router;