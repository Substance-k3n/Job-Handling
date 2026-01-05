const express = require('express');
const router = express.Router();

const {
  createJob,
  getAdminJobs,
  getAdminJobById,
  deleteJob,
  updateJobStatus
} = require('../controllers/jobController');

const { jobValidator } = require('../validators/jobValidator');
const validateRequest = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All routes here require authentication and admin role
router.use(protect);
router.use(authorize('admin', 'super_admin'));

/**
 * @swagger
 * /admin/jobs:
 *   post:
 *     tags: [Jobs - Admin]
 *     summary: STEP 2 - Create a new job
 *     description: |
 *       Create job metadata. Job is created as INACTIVE by default and not visible to users.
 *       You must add fields and then publish it to make it visible.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateJobRequest'
 *           example:
 *             title: Frontend Developer
 *             description: We are hiring a React developer with 3+ years of experience
 *             validFrom: "2026-01-12T10:00:00Z"
 *             validTo: "2026-01-31T23:59:59Z"
 *     responses:
 *       201:
 *         description: Job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobResponse'
 *             example:
 *               success: true
 *               message: Job created successfully
 *               data:
 *                 id: 677a1b2c3d4e5f6789abcdef
 *       400:
 *         description: Validation error - Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Title, description, and validTo are required
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/', jobValidator, validateRequest, createJob);

/**
 * @swagger
 * /admin/jobs:
 *   get:
 *     tags: [Jobs - Admin]
 *     summary: Get all jobs (Admin view)
 *     description: |
 *       Retrieve all jobs regardless of status (ACTIVE, INACTIVE).
 *       Includes jobs that are expired or not yet valid.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Jobs retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 677a1b2c3d4e5f6789abcdef
 *                       title:
 *                         type: string
 *                         example: Frontend Developer
 *                       description:
 *                         type: string
 *                         example: We are hiring a React developer...
 *                       status:
 *                         type: string
 *                         enum: [ACTIVE, INACTIVE]
 *                         example: INACTIVE
 *                       validFrom:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-01-12T10:00:00Z"
 *                       validTo:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-01-31T23:59:59Z"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-01-04T14:30:00Z"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', getAdminJobs);

/**
 * @swagger
 * /admin/jobs/{jobId}:
 *   get:
 *     tags: [Jobs - Admin]
 *     summary: Get single job with all fields
 *     description: |
 *       Retrieve complete job details including all form fields.
 *       Fields are returned sorted by order property.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID (MongoDB ObjectId)
 *         example: 677a1b2c3d4e5f6789abcdef
 *     responses:
 *       200:
 *         description: Job retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Job retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     status:
 *                       type: string
 *                     validFrom:
 *                       type: string
 *                       format: date-time
 *                     validTo:
 *                       type: string
 *                       format: date-time
 *                     fields:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           type:
 *                             type: string
 *                           question:
 *                             type: string
 *                           options:
 *                             type: array
 *                             items:
 *                               type: string
 *                           required:
 *                             type: boolean
 *                           order:
 *                             type: number
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Job not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:jobId', getAdminJobById);

/**
 * @swagger
 * /admin/jobs/{jobId}/status:
 *   patch:
 *     tags: [Jobs - Admin]
 *     summary: STEP 4 - Publish or unpublish a job
 *     description: |
 *       Change job status to make it visible or hidden to public users.
 *       
 *       **ACTIVE:** Job becomes visible if within validFrom/validTo dates.
 *       When set to ACTIVE, validFrom is automatically updated to current time.
 *       
 *       **INACTIVE:** Job is hidden from public view.
 *       
 *       **Job Visibility Logic:**
 *       A job is visible to users if:
 *       - status === 'ACTIVE'
 *       - current time >= validFrom
 *       - current time <= validTo
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *         example: 677a1b2c3d4e5f6789abcdef
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateJobStatusRequest'
 *           example:
 *             status: ACTIVE
 *     responses:
 *       200:
 *         description: Job status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Job published and live successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 677a1b2c3d4e5f6789abcdef
 *                     status:
 *                       type: string
 *                       example: ACTIVE
 *                     validFrom:
 *                       type: string
 *                       format: date-time
 *                       description: Updated to current time when set to ACTIVE
 *                       example: "2026-01-04T15:00:00Z"
 *       400:
 *         description: Invalid status value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Invalid status. Must be ACTIVE or INACTIVE
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:jobId/status', updateJobStatus);

/**
 * @swagger
 * /admin/jobs/{jobId}:
 *   delete:
 *     tags: [Jobs - Admin]
 *     summary: Delete a job permanently
 *     description: |
 *       Permanently delete a job and all its associated data:
 *       - Job metadata
 *       - All form fields
 *       - Applications (optional - you may want to keep these)
 *       
 *       **Warning:** This action cannot be undone!
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *         example: 677a1b2c3d4e5f6789abcdef
 *     responses:
 *       200:
 *         description: Job deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Job deleted successfully
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Job not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.delete('/:jobId', deleteJob);

module.exports = router;