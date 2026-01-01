const express = require('express');
const {
  applyForJob,
  getJobResponses,
  getResponseDetail,
  toggleSaveResponse,
  sendInterviewInvitation,
  sendAcceptanceEmail
} = require('../controllers/applicationController');

const {
  moveStage
} = require('../controllers/pipelineController');

const { applicationValidator } = require('../validators/applicationValidator');
const { 
  validateMoveStage, 
  validateApplicationId 
} = require('../validators/pipelineValidator');

const validateRequest = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { upload, uploadToMinio } = require('../config/multer');

const router = express.Router();

// --- USER ROUTES ---
router.post(
  '/:jobId/apply',
  protect,
  authorize('user'),
  upload.single('cv'),
  uploadToMinio,
  applicationValidator,
  validateRequest,
  applyForJob
);

// --- ADMIN ROUTES ---

// Get all applications/responses for a specific job
router.get('/job/:jobId', protect, authorize('admin'), getJobResponses);

// Get detail for a single application
router.get('/:responseId', protect, authorize('admin'), getResponseDetail);

// Save or unsave an application
router.patch('/:responseId/save', protect, authorize('admin'), toggleSaveResponse);

// Move application stage (Pipeline)
router.patch(
  '/:id/move-stage',
  protect,
  authorize('admin'),
  validateMoveStage,
  validateRequest,
  moveStage
);

// Invitations and Acceptances
router.post('/:responseId/send-invitation', protect, authorize('admin'), sendInterviewInvitation);
router.post('/:responseId/send-acceptance', protect, authorize('admin'), sendAcceptanceEmail);

module.exports = router;