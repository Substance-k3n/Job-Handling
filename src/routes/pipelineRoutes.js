
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

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

router.get(
  '/jobs/:jobId/pipeline-stats',
  protect,
  authorize('admin'),
  validateJobId,
  validateRequest,
  getPipelineStats
);

router.get(
  '/applications/pipeline',
  protect,
  authorize('admin'),
  getKanbanBoard
);

module.exports = router;