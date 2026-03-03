
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
 *     description: Frontend walkthrough - (1) start milestone by setting status=IN_PROGRESS with startDate and endDate, (2) extend schedule by patching IN_PROGRESS with a later endDate, (3) complete manually with status=COMPLETED and endDate. Dates are always request payload values (never auto-generated). If endDate passes while still IN_PROGRESS, status may auto-update to COMPLETED.
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
 *           examples:
 *             startMilestone:
 *               summary: Start milestone manually
 *               value:
 *                 status: IN_PROGRESS
 *                 startDate: '2026-03-03T08:00:00.000Z'
 *                 endDate: '2026-03-06T17:00:00.000Z'
 *             extendMilestoneEndDate:
 *               summary: Extend endDate while still IN_PROGRESS
 *               value:
 *                 status: IN_PROGRESS
 *                 startDate: '2026-03-03T08:00:00.000Z'
 *                 endDate: '2026-03-08T17:00:00.000Z'
 *             completeMilestone:
 *               summary: Complete milestone manually
 *               value:
 *                 status: COMPLETED
 *                 endDate: '2026-03-08T17:00:00.000Z'
 *     responses:
 *       200:
 *         description: Milestone status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MilestoneResponse'
 *             examples:
 *               inProgressResult:
 *                 summary: Milestone started
 *                 value:
 *                   success: true
 *                   message: Milestone status updated successfully
 *                   data:
 *                     id: 67c4c4a0f5a3a2d9f3531001
 *                     title: Design phase
 *                     order: 1
 *                     status: IN_PROGRESS
 *                     startDate: '2026-03-03T08:00:00.000Z'
 *                     endDate: '2026-03-06T17:00:00.000Z'
 *                     updatedAt: '2026-03-03T10:30:00.000Z'
 *               completedResult:
 *                 summary: Milestone completed
 *                 value:
 *                   success: true
 *                   message: Milestone status updated successfully
 *                   data:
 *                     id: 67c4c4a0f5a3a2d9f3531001
 *                     title: Design phase
 *                     order: 1
 *                     status: COMPLETED
 *                     startDate: '2026-03-03T08:00:00.000Z'
 *                     endDate: '2026-03-08T17:00:00.000Z'
 *                     updatedAt: '2026-03-08T17:05:00.000Z'
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