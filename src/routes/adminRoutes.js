const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const captureMetadata = require('../middleware/captureMetadata');

// Import controllers
const {
  getJobResponses,
  getResponseDetail,
  toggleSaveResponse,
  sendInterviewInvitation,
  sendAcceptanceEmail
} = require('../controllers/applicationController');

const {
  createJob,
  getAdminJobs,
  getAdminJobById,
  deleteJob,
  updateJobStatus,
  updateJobMetadata
} = require('../controllers/jobController');

const {
  addJobField,
  reorderFields,
  updateField,
  deleteField,
  getJobFields
} = require('../controllers/applicationFormController');

const { jobValidator } = require('../validators/jobValidator');
const validateRequest = require('../middleware/validateRequest');

// Apply authentication and authorization to all admin routes
router.use(protect);
router.use(authorize('admin', 'super_admin'));
router.use(captureMetadata);

// ========================================
// JOB MANAGEMENT ROUTES
// ========================================

/**
 * @swagger
 * /admin/jobs:
 *   post:
 *     tags: [Jobs - Admin]
 *     summary: STEP 2 - Create a new job
 *     description: Create job metadata using the new format. Job is created as INACTIVE by default.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateJobRequest'
 *           example:
 *             title: Software Engineer
 *             description: We are looking for a skilled Software Engineer to join our growing development team. The ideal candidate will have strong problem-solving skills and experience in modern web technologies.
 *             location: Addis Ababa, Ethiopia
 *             type: full-time
 *             work_mode: hybrid
 *             key_responsibilities:
 *               - Develop and maintain web applications
 *               - Collaborate with cross-functional teams
 *               - Write clean, scalable code
 *               - Participate in code reviews
 *               - Troubleshoot and debug issues
 *             what_we_offer:
 *               - Competitive salary
 *               - Health and dental insurance
 *               - Remote work flexibility
 *               - Professional development opportunities
 *               - Generous vacation policy
 *             requirements:
 *               - Bachelor's degree in Computer Science or related field
 *               - 3+ years of experience in software development
 *               - Proficiency in JavaScript, React, and Node.js
 *               - Strong problem-solving skills
 *               - Excellent communication and teamwork abilities
 *             deadline: "2026-02-15T17:00:00Z"
 *     responses:
 *       201:
 *         description: Job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/jobs', jobValidator, validateRequest, createJob);

/**
 * @swagger
 * /admin/jobs:
 *   get:
 *     tags: [Jobs - Admin]
 *     summary: Get all jobs
 *     description: Retrieve all jobs with their metadata and status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/jobs', getAdminJobs);

/**
 * @swagger
 * /admin/jobs/{jobId}:
 *   get:
 *     tags: [Jobs - Admin]
 *     summary: Get single job with fields
 *     description: Retrieve job details including all form fields
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job retrieved successfully
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 */
router.get('/jobs/:jobId', getAdminJobById);

/**
 * @swagger
 * /admin/jobs/{jobId}/status:
 *   patch:
 *     tags: [Jobs - Admin]
 *     summary: STEP 4 - Publish/Unpublish job
 *     description: |
 *       Change job status to ACTIVE or INACTIVE.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateJobStatusRequest'
 *     responses:
 *       200:
 *         description: Job status updated successfully with metadata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobStatusUpdateResponse'
 *       400:
 *         description: Invalid status value
 *       404:
 *         description: Job not found
 */
router.patch('/jobs/:jobId/status', updateJobStatus);

/**
 * @swagger
 * /admin/jobs/{jobId}:
 *   patch:
 *     tags: [Jobs - Admin]
 *     summary: Update job metadata (new format)
 *     description: Update metadata fields of a job (title, description, location, type, work_mode, key_responsibilities, what_we_offer, requirements, deadline, status). If setting status to ACTIVE, the job must already have at least one form field.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateJobRequest'
 *           examples:
 *             fullUpdate:
 *               summary: Update multiple fields
 *               value:
 *                 title: Software Engineer
 *                 description: We are looking for a skilled Software Engineer to join our growing development team.
 *                 location: Addis Ababa, Ethiopia
 *                 type: full-time
 *                 work_mode: hybrid
 *                 key_responsibilities:
 *                   - Develop and maintain web applications
 *                   - Collaborate with cross-functional teams
 *                 what_we_offer:
 *                   - Competitive salary
 *                   - Professional development opportunities
 *                 requirements:
 *                   - Bachelor's degree in Computer Science or related field
 *                 deadline: 2026-02-15T17:00:00Z
 *                 status: ACTIVE
 *     responses:
 *       200:
 *         description: Job updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdateJobResponse'
 *       400:
 *         description: Validation error (invalid status or date range)
 *       404:
 *         description: Job not found
 */
router.patch('/jobs/:jobId', updateJobMetadata);

/**
 * @swagger
 * /admin/jobs/{jobId}:
 *   delete:
 *     tags: [Jobs - Admin]
 *     summary: Delete a job
 *     description: Permanently delete a job and all its associated fields
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job deleted successfully
 *       404:
 *         description: Job not found
 */
router.delete('/jobs/:jobId', deleteJob);

// ========================================
// JOB FIELDS (FORM BUILDER) ROUTES
// ========================================

/**
 * @swagger
 * /admin/jobs/{jobId}/fields:
 *   post:
 *     tags: [Job Fields - Admin]
 *     summary: STEP 3 - Add a field to job form
 *     description: Add a new field to the job application form
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddFieldRequest'
 *     responses:
 *       201:
 *         description: Field added successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Job not found
 */
router.post('/jobs/:jobId/fields', addJobField);

/**
 * @swagger
 * /admin/jobs/{jobId}/fields:
 *   get:
 *     tags: [Job Fields - Admin]
 *     summary: Get all fields for a job
 *     description: Retrieve all form fields for a specific job, sorted by order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job fields retrieved successfully
 *       400:
 *         description: Invalid job ID
 */
router.get('/jobs/:jobId/fields', getJobFields);

/**
 * @swagger
 * /admin/jobs/{jobId}/fields/reorder:
 *   patch:
 *     tags: [Job Fields - Admin]
 *     summary: Reorder form fields
 *     description: Change the display order of multiple fields at once
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReorderFieldsRequest'
 *     responses:
 *       200:
 *         description: Fields reordered successfully
 */
router.patch('/jobs/:jobId/fields/reorder', reorderFields);

/**
 * @swagger
 * /admin/jobs/{jobId}/fields/{fieldId}:
 *   patch:
 *     tags: [Job Fields - Admin]
 *     summary: Update a specific field
 *     description: Modify properties of an existing form field
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: fieldId
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
 *               question:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               required:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Field updated successfully
 *       404:
 *         description: Job or field not found
 */
router.patch('/jobs/:jobId/fields/:fieldId', updateField);

/**
 * @swagger
 * /admin/jobs/{jobId}/fields/{fieldId}:
 *   delete:
 *     tags: [Job Fields - Admin]
 *     summary: Delete a field
 *     description: Remove a field from the job application form
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: fieldId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Field deleted successfully
 *       404:
 *         description: Job or field not found
 */
router.delete('/jobs/:jobId/fields/:fieldId', deleteField);

// ========================================
// APPLICATION RESPONSES MANAGEMENT
// ========================================

/**
 * @swagger
 * /admin/jobs/{jobId}/responses:
 *   get:
 *     tags: [Applications - Admin]
 *     summary: STEP 8 - Get all responses for a job
 *     description: Fetch all applications submitted for a specific job
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Responses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApplicationResponseList'
 */
router.get('/jobs/:jobId/responses', getJobResponses);

/**
 * @swagger
 * /admin/responses/{responseId}:
 *   get:
 *     tags: [Applications - Admin]
 *     summary: STEP 9 - Get single response detail
 *     description: Fetch detailed information about a specific application
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: responseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Response/Application ID
 *     responses:
 *       200:
 *         description: Response retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApplicationResponseDetail'
 *       404:
 *         description: Response not found
 */
router.get('/responses/:responseId', getResponseDetail);

/**
 * @swagger
 * /admin/responses/{responseId}/save:
 *   patch:
 *     tags: [Applications - Admin]
 *     summary: STEP 10 - Save/Unsave response
 *     description: Toggle the saved status of an application
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: responseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isSaved
 *             properties:
 *               isSaved:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Response save status updated
 *       404:
 *         description: Response not found
 */
router.patch('/responses/:responseId/save', toggleSaveResponse);

/**
 * @swagger
 * /admin/responses/{responseId}/send-invitation:
 *   post:
 *     tags: [Applications - Admin]
 *     summary: STEP 11 - Send interview invitation (Phase 2)
 *     description: Send interview invitation email with Google Meet link
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: responseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendInvitationRequest'
 *     responses:
 *       200:
 *         description: Interview invitation sent successfully
 *       404:
 *         description: Response not found
 */
router.post('/responses/:responseId/send-invitation', sendInterviewInvitation);

/**
 * @swagger
 * /admin/responses/{responseId}/send-acceptance:
 *   post:
 *     tags: [Applications - Admin]
 *     summary: STEP 12 - Send acceptance email (Phase 2)
 *     description: Send job acceptance email to applicant using the new acceptance format.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: responseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Application/response ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendAcceptanceRequest'
 *           examples:
 *             default:
 *               summary: Send acceptance email
 *               value:
 *                 applicant_name: Jane Doe
 *                 role: Frontend Developer
 *                 custom_message: >-
 *                   Please find the attached offer letter with details about your
 *                   compensation and benefits. Kindly sign and return it by January 20, 2026.
 *                 sender_name: John Smith
 *                 sender_title: Talent Acquisition Manager
 *     responses:
 *       200:
 *         description: Acceptance email sent successfully
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
 *                   example: Acceptance Email sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     responseId:
 *                       type: string
 *                       example: 679c1d2e3f4g5h6789ijklmn
 *                     isAccepted:
 *                       type: boolean
 *                       example: true
 *                     acceptanceDetails:
 *                       type: object
 *                       properties:
 *                         applicant_name:
 *                           type: string
 *                           example: Jane Doe
 *                         role:
 *                           type: string
 *                           example: Frontend Developer
 *                         custom_message:
 *                           type: string
 *                           example: Please find the attached offer letter with details about your compensation and benefits.
 *                         sender_name:
 *                           type: string
 *                           example: John Smith
 *                         sender_title:
 *                           type: string
 *                           example: Talent Acquisition Manager
 *       404:
 *         description: Response not found
 *       400:
 *         description: Validation error (missing required acceptance fields)
 */
router.post('/responses/:responseId/send-acceptance', sendAcceptanceEmail);

module.exports = router;