/**
 * @swagger
 * tags:
 *   - name: Application Forms
 *     description: Custom application form management for jobs
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const captureMetadata = require('../middleware/captureMetadata');
const {
  createOrUpdateForm,
  getFormByJob,
  getFormById,
  deleteForm,
  duplicateForm,
  getFormTemplates
} = require('../controllers/applicationFormController');

router.use(captureMetadata);

/**
 * @swagger
 * /api/application-forms/job/{jobId}:
 *   get:
 *     summary: Get application form for a specific job (Public)
 *     tags: [Application Forms]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Application form retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     job:
 *                       type: object
 *                     title:
 *                       type: string
 *                     sections:
 *                       type: array
 *                     settings:
 *                       type: object
 *       404:
 *         description: Job not found
 */
router.get('/job/:jobId', getFormByJob);

router.use(protect);

/**
 * @swagger
 * /api/application-forms/templates:
 *   get:
 *     summary: Get pre-defined form templates (Admin only)
 *     tags: [Application Forms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Form templates retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/templates', authorize('admin', 'super_admin'), getFormTemplates);

/**
 * @swagger
 * /api/application-forms:
 *   post:
 *     summary: Create or update application form for a job (Admin only)
 *     tags: [Application Forms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - job
 *             properties:
 *               job:
 *                 type: string
 *                 description: Job ID
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               sections:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     section_id:
 *                       type: string
 *                     section_title:
 *                       type: string
 *                     questions:
 *                       type: array
 *               settings:
 *                 type: object
 *     responses:
 *       201:
 *         description: Form created successfully
 *       200:
 *         description: Form updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', authorize('admin', 'super_admin'), createOrUpdateForm);

/**
 * @swagger
 * /api/application-forms/{id}:
 *   get:
 *     summary: Get application form by ID (Admin only)
 *     tags: [Application Forms]
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
 *         description: Form retrieved
 *       404:
 *         description: Form not found
 *   delete:
 *     summary: Delete application form (Admin only)
 *     tags: [Application Forms]
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
 *         description: Form deleted successfully
 *       404:
 *         description: Form not found
 */
router.get('/:id', authorize('admin', 'super_admin'), getFormById);
router.delete('/:id', authorize('admin', 'super_admin'), deleteForm);

/**
 * @swagger
 * /api/application-forms/duplicate/{formId}:
 *   post:
 *     summary: Duplicate form to another job (Admin only)
 *     tags: [Application Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: formId
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
 *               - job
 *             properties:
 *               job:
 *                 type: string
 *                 description: Target job ID
 *     responses:
 *       201:
 *         description: Form duplicated successfully
 *       404:
 *         description: Source form or target job not found
 */
router.post('/duplicate/:formId', authorize('admin', 'super_admin'), duplicateForm);

module.exports = router;