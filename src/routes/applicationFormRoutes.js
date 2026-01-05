const express = require('express');
const router = express.Router({ mergeParams: true }); // IMPORTANT: mergeParams to access :jobId

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

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin', 'super_admin'));
router.use(captureMetadata);

/**
 * @swagger
 * /admin/jobs/{jobId}/fields:
 *   post:
 *     tags: [Job Fields - Admin]
 *     summary: STEP 3 - Add a field to job application form
 *     description: |
 *       Add a new field to the job application form. Works like Google Forms.
 *       
 *       **Available Field Types:**
 *       - `short_answer` - Single line text input (e.g., name, email)
 *       - `paragraph` - Multi-line text area (e.g., cover letter)
 *       - `multiple_choice` - Radio buttons - single selection (requires options)
 *       - `checkboxes` - Multiple checkboxes - multi selection (requires options)
 *       - `dropdown` - Select dropdown menu (requires options)
 *       - `file` - File upload (e.g., CV, resume)
 *       - `rating` - Star rating or numeric scale
 *       - `date` - Date picker
 *       - `time` - Time picker
 *       
 *       **For multiple_choice, checkboxes, and dropdown:**
 *       You MUST provide an `options` array with at least one option.
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
 *             $ref: '#/components/schemas/AddFieldRequest'
 *           examples:
 *             shortAnswer:
 *               summary: Short Answer Field
 *               value:
 *                 type: short_answer
 *                 question: What is your full name?
 *                 required: true
 *                 order: 1
 *             paragraph:
 *               summary: Paragraph Field
 *               value:
 *                 type: paragraph
 *                 question: Tell us why you want to join our company
 *                 required: true
 *                 order: 4
 *             multipleChoice:
 *               summary: Multiple Choice Field
 *               value:
 *                 type: multiple_choice
 *                 question: Years of Experience
 *                 options: ["0-1", "2-3", "4-5", "5+"]
 *                 required: true
 *                 order: 3
 *             checkboxes:
 *               summary: Checkboxes Field
 *               value:
 *                 type: checkboxes
 *                 question: What technologies do you know?
 *                 options: ["React", "Node.js", "Python", "Java", "Go"]
 *                 required: false
 *                 order: 5
 *             dropdown:
 *               summary: Dropdown Field
 *               value:
 *                 type: dropdown
 *                 question: Preferred work location
 *                 options: ["Remote", "Office", "Hybrid"]
 *                 required: true
 *                 order: 6
 *             file:
 *               summary: File Upload Field
 *               value:
 *                 type: file
 *                 question: Upload your CV/Resume
 *                 required: true
 *                 order: 2
 *             rating:
 *               summary: Rating Field
 *               value:
 *                 type: rating
 *                 question: Rate your JavaScript skills (1-5)
 *                 required: false
 *                 order: 7
 *             date:
 *               summary: Date Field
 *               value:
 *                 type: date
 *                 question: When can you start?
 *                 required: true
 *                 order: 8
 *             time:
 *               summary: Time Field
 *               value:
 *                 type: time
 *                 question: Preferred interview time
 *                 required: false
 *                 order: 9
 *     responses:
 *       201:
 *         description: Field added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FieldResponse'
 *             example:
 *               success: true
 *               message: Field added successfully
 *               data:
 *                 fieldId: 677b2c3d4e5f6789abcdef01
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidType:
 *                 summary: Invalid Field Type
 *                 value:
 *                   success: false
 *                   message: Invalid field type
 *               missingOptions:
 *                 summary: Missing Options
 *                 value:
 *                   success: false
 *                   message: Options are required for multiple_choice field type
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', addJobField);

/**
 * @swagger
 * /admin/jobs/{jobId}/fields:
 *   get:
 *     tags: [Job Fields - Admin]
 *     summary: Get all fields for a job
 *     description: |
 *       Retrieve all form fields for a specific job.
 *       Fields are automatically sorted by the order property (ascending).
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
 *         description: Job fields retrieved successfully
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
 *                   example: Job fields retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobId:
 *                       type: string
 *                       example: 677a1b2c3d4e5f6789abcdef
 *                     fields:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: 677b2c3d4e5f6789abcdef01
 *                           type:
 *                             type: string
 *                             example: short_answer
 *                           question:
 *                             type: string
 *                             example: What is your full name?
 *                           options:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: []
 *                           required:
 *                             type: boolean
 *                             example: true
 *                           order:
 *                             type: number
 *                             example: 1
 *       400:
 *         description: Invalid job ID
 *       404:
 *         description: Job not found or no fields exist
 *       401:
 *         description: Unauthorized
 */
router.get('/', getJobFields);

/**
 * @swagger
 * /admin/jobs/{jobId}/fields/reorder:
 *   patch:
 *     tags: [Job Fields - Admin]
 *     summary: Reorder multiple form fields
 *     description: |
 *       Change the display order of multiple fields at once.
 *       This is useful when you want to reorganize the form after adding several fields.
 *       
 *       **Note:** The request body key is `fields` (not `orders`).
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
 *             type: object
 *             required:
 *               - fields
 *             properties:
 *               fields:
 *                 type: array
 *                 description: Array of field reordering instructions
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - order
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Field ID
 *                     order:
 *                       type: number
 *                       description: New order position (starts from 1)
 *           example:
 *             fields:
 *               - id: 677b2c3d4e5f6789abcdef01
 *                 order: 3
 *               - id: 677b2c3d4e5f6789abcdef02
 *                 order: 1
 *               - id: 677b2c3d4e5f6789abcdef03
 *                 order: 2
 *     responses:
 *       200:
 *         description: Fields reordered successfully
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
 *                   example: Fields reordered successfully
 *       400:
 *         description: Invalid request - missing fields array
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Orders array is required
 *       404:
 *         description: Job fields not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/reorder', reorderFields);

/**
 * @swagger
 * /admin/jobs/{jobId}/fields/{fieldId}:
 *   patch:
 *     tags: [Job Fields - Admin]
 *     summary: Update a specific field
 *     description: |
 *       Modify properties of an existing form field.
 *       You can update any property except the field ID.
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
 *       - in: path
 *         name: fieldId
 *         required: true
 *         schema:
 *           type: string
 *         description: Field ID to update
 *         example: 677b2c3d4e5f6789abcdef01
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 description: Field type
 *               question:
 *                 type: string
 *                 description: Question text
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Options for multiple_choice, checkboxes, dropdown
 *               required:
 *                 type: boolean
 *                 description: Whether field is required
 *               order:
 *                 type: number
 *                 description: Display order
 *           examples:
 *             updateQuestion:
 *               summary: Update Question Text
 *               value:
 *                 question: How many years of React experience do you have?
 *             updateOptions:
 *               summary: Update Options
 *               value:
 *                 options: ["Less than 1 year", "1-2 years", "3-5 years", "5+ years"]
 *             updateRequired:
 *               summary: Change Required Status
 *               value:
 *                 required: false
 *             updateMultiple:
 *               summary: Update Multiple Properties
 *               value:
 *                 question: Years of professional experience
 *                 options: ["0-1", "2-3", "4-5", "5+"]
 *                 required: true
 *     responses:
 *       200:
 *         description: Field updated successfully
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
 *                   example: Field updated successfully
 *       404:
 *         description: Job or field not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               jobNotFound:
 *                 summary: Job Not Found
 *                 value:
 *                   success: false
 *                   message: Job fields not found
 *               fieldNotFound:
 *                 summary: Field Not Found
 *                 value:
 *                   success: false
 *                   message: Field not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:fieldId', updateField);

/**
 * @swagger
 * /admin/jobs/{jobId}/fields/{fieldId}:
 *   delete:
 *     tags: [Job Fields - Admin]
 *     summary: Delete a field from the form
 *     description: |
 *       Permanently remove a field from the job application form.
 *       
 *       **Warning:** This will also remove any answers to this field in existing applications.
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
 *       - in: path
 *         name: fieldId
 *         required: true
 *         schema:
 *           type: string
 *         description: Field ID to delete
 *         example: 677b2c3d4e5f6789abcdef01
 *     responses:
 *       200:
 *         description: Field deleted successfully
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
 *                   example: Field deleted successfully
 *       404:
 *         description: Job or field not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.delete('/:fieldId', deleteField);

module.exports = router;