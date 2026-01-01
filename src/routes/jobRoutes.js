// 1. Import the form controller at the top
const { createOrUpdateForm } = require('../controllers/applicationFormController');
const express = require('express');
const {
  createJob,
  getAdminJobs,
  getAdminJobById,
  deleteJob,
  updateJobStatus // Added this since it exists in your controller
} = require('../controllers/jobController');

const { 
  getPublicJobs, 
  getPublicJobById 
} = require('../controllers/publicJobController');

const { jobValidator } = require('../validators/jobValidator');
const validateRequest = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

// --- PUBLIC ROUTES ---
router.get('/public', getPublicJobs);
router.get('/public/:jobId', getPublicJobById);

// --- ADMIN ROUTES ---
router.get('/', protect, authorize('admin'), getAdminJobs);
router.get('/:id', protect, authorize('admin'), getAdminJobById);
router.post('/', protect, authorize('admin'), jobValidator, validateRequest, createJob);
router.post('/:id/fields', protect, authorize('admin'), createOrUpdateForm);
router.delete('/:id', protect, authorize('admin'), deleteJob);

// Change the status of a job (ACTIVE/INACTIVE)
router.patch('/:jobId/status', protect, authorize('admin'), updateJobStatus);

module.exports = router;