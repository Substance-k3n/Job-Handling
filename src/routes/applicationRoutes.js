const express = require('express');
const {
  applyForJob,
  getMyApplications,
  getAllApplications,
  getJobApplications,
  getApplicationById,
  updateApplicationStatus
} = require('../controllers/applicationController');
const { applicationValidator, updateStatusValidator } = require('../validators/applicationValidator');
const validateRequest = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('./config/multer');

const router = express.Router();

// User routes
router.post(
  '/',
  protect,
  authorize('user'),
  upload.single('cv'),
  applicationValidator,
  validateRequest,
  applyForJob
);
router.get('/my-applications', protect, authorize('user'), getMyApplications);

// Admin routes
router.get('/', protect, authorize('admin'), getAllApplications);
router.get('/job/:jobId', protect, authorize('admin'), getJobApplications);
router.patch(
  '/:id/status',
  protect,
  authorize('admin'),
  updateStatusValidator,
  validateRequest,
  updateApplicationStatus
);

// Shared route
router.get('/:id', protect, getApplicationById);

module.exports = router;