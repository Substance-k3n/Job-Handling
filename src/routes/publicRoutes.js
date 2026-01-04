const express = require('express');
const router = express.Router();
const publicJobController = require('../controllers/publicJobController');
const applicationController = require('../controllers/applicationController');
// Change this line in src/routes/publicRoutes.js
const { upload, uploadToMinio } = require('../config/multer');
router.get('/jobs', publicJobController.getPublicJobs);
router.get('/jobs/:jobId', publicJobController.getPublicJobById);

// Add uploadToMinio AFTER upload.single('cv')
router.post(
  '/jobs/:jobId/apply', 
  upload.single('cv'), 
  uploadToMinio, // <--- This moves it from your PC to MinIO
  applicationController.applyForJob
);

module.exports = router;