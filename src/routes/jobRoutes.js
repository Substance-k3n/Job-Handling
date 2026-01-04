const express = require('express');
const router = express.Router();

// 1. IMPORT (Make sure these names match the controller)
const { addJobField } = require('../controllers/applicationFormController');
const {
  createJob,
  getAdminJobs,
  getAdminJobById,
  deleteJob,
  updateJobStatus
} = require('../controllers/jobController');

const { 
  getPublicJobs, 
  getPublicJobById 
} = require('../controllers/publicJobController');

const { jobValidator } = require('../validators/jobValidator');
const validateRequest = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// --- PUBLIC ROUTES ---
router.get('/public', getPublicJobs);
router.get('/public/:jobId', getPublicJobById);

// --- ADMIN ROUTES ---
router.get('/', protect, authorize('admin'), getAdminJobs);
router.get('/:id', protect, authorize('admin'), getAdminJobById);
router.post('/', protect, authorize('admin'), jobValidator, validateRequest, createJob);

// FIXED LINE 32: Changed 'createOrUpdateForm' to 'addJobField'
router.post('/:id/fields', protect, authorize('admin'), addJobField);

router.delete('/:id', protect, authorize('admin'), deleteJob);

// Change the status of a job (ACTIVE/INACTIVE)
router.patch('/:jobId/status', protect, authorize('admin'), updateJobStatus);

module.exports = router;