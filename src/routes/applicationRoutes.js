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
const upload = require('../config/multer');

const router = express.Router();

// User routes
/**
 * @swagger
 * /api/applications:
 *   post:
 *     tags: [Applications]
 *     summary: Apply for a job (user only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               job:
 *                 type: string
 *               coverLetter:
 *                 type: string
 *               cv:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Application submitted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Application'
 *       400:
 *         description: Validation error
 */
router.post(
  '/',
  protect,
  authorize('user'),
  upload.single('cv'),
  applicationValidator,
  validateRequest,
  applyForJob
);

/**
 * @swagger
 * /api/applications/my-applications:
 *   get:
 *     tags: [Applications]
 *     summary: Get current user's applications (user only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's applications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Application'
 */
router.get('/my-applications', protect, authorize('user'), getMyApplications);

// Admin routes
/**
 * @swagger
 * /api/applications:
 *   get:
 *     tags: [Applications]
 *     summary: Get all applications (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of applications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Application'
 */
router.get('/', protect, authorize('admin'), getAllApplications);

/**
 * @swagger
 * /api/applications/job/{jobId}:
 *   get:
 *     tags: [Applications]
 *     summary: Get applications for a job (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of applications for the job
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Application'
 */
router.get('/job/:jobId', protect, authorize('admin'), getJobApplications);

/**
 * @swagger
 * /api/applications/{id}/status:
 *   patch:
 *     tags: [Applications]
 *     summary: Update application status (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application status updated
 */
router.patch(
  '/:id/status',
  protect,
  authorize('admin'),
  updateStatusValidator,
  validateRequest,
  updateApplicationStatus
);

// Shared route
/**
 * @swagger
 * /api/applications/{id}:
 *   get:
 *     tags: [Applications]
 *     summary: Get application by id (authenticated)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Application'
 */
router.get('/:id', protect, getApplicationById);

module.exports = router;
