const express = require('express');
const router = express.Router();
const publicJobController = require('../controllers/publicJobController');
const applicationController = require('../controllers/applicationController');

// Public job endpoints
router.get('/jobs', publicJobController.getPublicJobs);
router.get('/jobs/:jobId', publicJobController.getPublicJobById);
router.post('/jobs/:jobId/apply', applicationController.applyForJob);

module.exports = router;