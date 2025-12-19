const express = require('express');
const {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob
} = require('../controllers/jobController');
const { jobValidator } = require('../validators/jobValidator');
const validateRequest = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', getJobs);
router.get('/:id', getJobById);
router.post('/', protect, authorize('admin'), jobValidator, validateRequest, createJob);
router.put('/:id', protect, authorize('admin'), jobValidator, validateRequest, updateJob);
router.delete('/:id', protect, authorize('admin'), deleteJob);

module.exports = router;