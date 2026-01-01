const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const jobController = require('../controllers/jobController');
const applicationController = require('../controllers/applicationController');

// All admin routes require authentication
router.use(protect);
router.use(authorize('admin', 'super_admin'));

// Job Management
router.post('/jobs', jobController.createJob);
router.get('/jobs', jobController.getAdminJobs);
router.get('/jobs/:jobId', jobController.getAdminJobById);
router.delete('/jobs/:jobId', jobController.deleteJob);
router.patch('/jobs/:jobId/status', jobController.updateJobStatus);

// Job Fields
router.post('/jobs/:jobId/fields', jobController.addJobField);
router.patch('/jobs/:jobId/fields/reorder', jobController.reorderFields);
router.patch('/jobs/:jobId/fields/:fieldId', jobController.updateJobField);
router.delete('/jobs/:jobId/fields/:fieldId', jobController.deleteJobField);

// Responses (Applications)
router.get('/jobs/:jobId/responses', applicationController.getJobResponses);
router.get('/responses/:responseId', applicationController.getResponseDetail);
router.patch('/responses/:responseId/save', applicationController.toggleSaveResponse);
router.post('/responses/:responseId/send-invitation', applicationController.sendInterviewInvitation);
router.post('/responses/:responseId/send-acceptance', applicationController.sendAcceptanceEmail);

module.exports = router;