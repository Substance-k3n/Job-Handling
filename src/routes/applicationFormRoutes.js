const express = require('express');
const router = express.Router({ mergeParams: true });

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware'); 
const captureMetadata = require('../middleware/captureMetadata');

const {
  addJobField,
  reorderFields,
  updateField,
  deleteField,
  getJobFields
} = require('../controllers/applicationFormController');

router.use(captureMetadata);

// These routes are now RELATIVE to '/api/admin/jobs/:jobId/fields'
router.post('/api/admin/jobs/:jobId/fields', protect, authorize('admin'),addJobField);
router.get('/api/admin/jobs/:jobId/fields', protect, authorize('admin'), getJobFields); // FIXED: Removed long path
router.patch('/api/admin/jobs/:jobId/fields/reorder', protect, authorize('admin'), reorderFields);

// These routes use the fieldId suffix relative to the base
router.patch('/api/admin/jobs/:jobId/fields/:fieldId', protect, authorize('admin'), updateField); // FIXED: Removed long path
router.delete('/api/admin/jobs/:jobId/fields/:fieldId', protect, authorize('admin'), deleteField); // FIXED: Removed long path

module.exports = router;