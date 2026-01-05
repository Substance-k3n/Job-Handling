const express = require('express');
const router = express.Router();

const {
  getJobResponses,
  getResponseDetail,
  toggleSaveResponse,
  sendInterviewInvitation,
  sendAcceptanceEmail
} = require('../controllers/applicationController');

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const captureMetadata = require('../middleware/captureMetadata');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin', 'super_admin'));
router.use(captureMetadata);

/**
 * @swagger
 * /admin/jobs/{jobId}/responses:
 *   get:
 *     tags: [Applications - Admin]
 *     summary: STEP 8 - Get all responses/applications for a job
 *     description: |
 *       Fetch all applications submitted for a specific job.
 *       Returns a summary list with basic applicant information and status flags.
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
 *         description: Responses retrieved successfully
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
 *                   example: Responses retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       responseId:
 *                         type: string
 *                         example: 677c3d4e5f6789abcdef012
 *                       applicantName:
 *                         type: string
 *                         example: John Doe
 *                       applicantEmail:
 *                         type: string
 *                         example: john@gmail.com
 *                       applicantPhoneNumber:
 *                         type: string
 *                         example: "251962212818"
 *                       submittedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-01-12T12:00:00Z"
 *                       isSaved:
 *                         type: boolean
 *                         example: false
 *                         description: Admin has bookmarked/saved this application
 *                       isInvited:
 *                         type: boolean
 *                         example: false
 *                         description: Interview invitation has been sent
 *                       isAccepted:
 *                         type: boolean
 *                         example: false
 *                         description: Acceptance email has been sent
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Job not found
 */
router.get('/jobs/:jobId/responses', getJobResponses);

/**
 * @swagger
 * /admin/responses/{responseId}:
 *   get:
 *     tags: [Applications - Admin]
 *     summary: STEP 9 - Get single response/application detail
 *     description: |
 *       Fetch detailed information about a specific application including:
 *       - Complete applicant information
 *       - All answers to form questions
 *       - CV/file URLs (if uploaded)
 *       - Status flags
 *       
 *       Questions are matched with answers for easy display.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: responseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Response/Application ID
 *         example: 677c3d4e5f6789abcdef012
 *     responses:
 *       200:
 *         description: Response retrieved successfully
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
 *                   example: Response retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     applicant:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: John Doe
 *                         email:
 *                           type: string
 *                           example: john@gmail.com
 *                         phoneNumber:
 *                           type: string
 *                           example: "251962212818"
 *                         country:
 *                           type: string
 *                           example: ethiopia
 *                         city:
 *                           type: string
 *                           example: Addis Ababa
 *                     answers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           question:
 *                             type: string
 *                             example: Full Name
 *                           type:
 *                             type: string
 *                             example: short_answer
 *                           value:
 *                             oneOf:
 *                               - type: string
 *                               - type: array
 *                             example: John Doe
 *                       example:
 *                         - question: Full Name
 *                           type: short_answer
 *                           value: John Doe
 *                         - question: Upload CV
 *                           type: file
 *                           value: http://localhost:9000/job-uploads/cv-1234567890-resume.pdf
 *                         - question: Years of Experience
 *                           type: multiple_choice
 *                           value: "5+"
 *                         - question: Technologies Known
 *                           type: checkboxes
 *                           value: ["React", "Node.js", "MongoDB"]
 *                     isSaved:
 *                       type: boolean
 *                       example: true
 *                     isInvited:
 *                       type: boolean
 *                       example: false
 *                     isAccepted:
 *                       type: boolean
 *                       example: false
 *                     submittedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-01-12T12:00:00Z"
 *       404:
 *         description: Response not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Response not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/responses/:responseId', getResponseDetail);

/**
 * @swagger
 * /admin/responses/{responseId}/save:
 *   patch:
 *     tags: [Applications - Admin]
 *     summary: STEP 10 - Save or unsave a response
 *     description: |
 *       Toggle the saved/bookmarked status of an application.
 *       
 *       Use this to mark promising candidates or create a shortlist.
 *       Saved applications can be filtered/sorted in your admin UI.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: responseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Response/Application ID
 *         example: 677c3d4e5f6789abcdef012
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
 *                 description: Set to true to save/bookmark, false to unsave
 *           examples:
 *             save:
 *               summary: Save Application
 *               value:
 *                 isSaved: true
 *             unsave:
 *               summary: Unsave Application
 *               value:
 *                 isSaved: false
 *     responses:
 *       200:
 *         description: Response save status updated
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
 *                   example: Response save status updated
 *       404:
 *         description: Response not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Response not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/responses/:responseId/save', toggleSaveResponse);

/**
 * @swagger
 * /admin/responses/{responseId}/send-invitation:
 *   post:
 *     tags: [Applications - Admin]
 *     summary: STEP 11 - Send interview invitation (Phase 2)
 *     description: |
 *       Send interview invitation email with Google Meet link.
 *       
 *       **Backend automatically:**
 *       1. Creates a Google Calendar event
 *       2. Generates a Google Meet link
 *       3. Sends email to applicant with details
 *       4. Sets isInvited flag to true
 *       5. Stores interview details in database
 *       
 *       **Phase 2 Feature** - Requires Google Calendar API setup.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: responseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Response/Application ID
 *         example: 677c3d4e5f6789abcdef012
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - interviewDate
 *               - interviewTime
 *             properties:
 *               interviewDate:
 *                 type: string
 *                 format: date
 *                 description: Interview date in YYYY-MM-DD format
 *                 example: "2026-01-20"
 *               interviewTime:
 *                 type: string
 *                 description: Interview time in HH:MM format (24-hour)
 *                 example: "10:00"
 *           example:
 *             interviewDate: "2026-01-20"
 *             interviewTime: "14:30"
 *     responses:
 *       200:
 *         description: Interview invitation sent successfully
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
 *                   example: Interview invitation sent successfully
 *       404:
 *         description: Response not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error (Google Calendar/Email service failure)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Failed to create Google Calendar event
 */
router.post('/responses/:responseId/send-invitation', sendInterviewInvitation);

/**
 * @swagger
 * /admin/responses/{responseId}/send-acceptance:
 *   post:
 *     tags: [Applications - Admin]
 *     summary: STEP 12 - Send acceptance email (Phase 2)
 *     description: |
 *       Send job acceptance/offer email to applicant.
 *       
 *       **Backend automatically:**
 *       1. Sends congratulations email to applicant
 *       2. Sets isAccepted flag to true
 *       3. Records acceptance timestamp
 *       
 *       **Phase 2 Feature** - Requires email service setup.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: responseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Response/Application ID
 *         example: 677c3d4e5f6789abcdef012
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
 *       404:
 *         description: Response not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Response not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error (Email service failure)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Failed to send acceptance email
 */
router.post('/responses/:responseId/send-acceptance', sendAcceptanceEmail);

module.exports = router;