
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
 * @route   PUT /api/admin/milestones/:milestoneId
 * @desc    Update milestone (title/description only)
 * @access  Admin only
 */
router.put('/:milestoneId', updateMilestone);

/**
 * @route   PATCH /api/admin/milestones/:milestoneId/status
 * @desc    Update milestone status
 * @access  Admin only
 */
router.patch('/:milestoneId/status', updateMilestoneStatus);

/**
 * @route   DELETE /api/admin/milestones/:milestoneId
 * @desc    Delete milestone and reorder remaining
 * @access  Admin only
 */
router.delete('/:milestoneId', deleteMilestone);

module.exports = router;