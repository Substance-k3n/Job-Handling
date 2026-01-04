const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const jobController = require('../controllers/jobController');
const applicationController = require('../controllers/applicationController');

router.use(protect);
router.use(authorize('admin', 'super_admin'));

// Job Management

router.get('/:jobId/responses', applicationController.getJobResponses);
router.get('/:jobId/responses/:responseId', applicationController.getResponseDetail);
router.patch('/:jobId/responses/:responseId/save', applicationController.toggleSaveResponse);
router.post('/:jobId/responses/:responseId/send-invitation', applicationController.sendInterviewInvitation);
router.post('/:jobId/responses/:responseId/send-acceptance', applicationController.sendAcceptanceEmail);

module.exports = router;