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
 *       
 *       **Supports powerful filtering by application status:**
 *       
 *       **Available Filters:**
 *       - `isSaved` - Bookmarked/shortlisted applications
 *       - `isInvited` - Applications where interview invitation has been sent
 *       - `isAccepted` - Applications where acceptance/offer has been sent
 *       
 *       **Filter Examples:**
 *       - `?isSaved=true` - Get all saved applications
 *       - `?isInvited=false` - Get applications not yet invited
 *       - `?isSaved=true&isInvited=false` - Saved but not invited (ready to invite)
 *       - `?isInvited=true&isAccepted=false` - In interview process
 *       - `?isAccepted=true` - All hired candidates
 *       
 *       **No filters = returns all applications**
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
 *       - in: query
 *         name: isSaved
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter by saved/bookmarked status
 *         examples:
 *           saved:
 *             summary: Get saved applications only
 *             value: true
 *           notSaved:
 *             summary: Get not saved applications only
 *             value: false
 *       - in: query
 *         name: isInvited
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter by interview invitation status
 *         examples:
 *           invited:
 *             summary: Get invited applications only
 *             value: true
 *           notInvited:
 *             summary: Get not invited applications only
 *             value: false
 *       - in: query
 *         name: isAccepted
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter by acceptance/offer status
 *         examples:
 *           accepted:
 *             summary: Get accepted applications only
 *             value: true
 *           notAccepted:
 *             summary: Get not accepted applications only
 *             value: false
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
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       description: Total number of responses matching filters
 *                       example: 5
 *                     filters:
 *                       type: object
 *                       properties:
 *                         isSaved:
 *                           type: string
 *                           nullable: true
 *                           example: "true"
 *                         isInvited:
 *                           type: string
 *                           nullable: true
 *                           example: "false"
 *                         isAccepted:
 *                           type: string
 *                           nullable: true
 *                           example: null
 *                       description: Applied filters (null means no filter)
 *                     responses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           responseId:
 *                             type: string
 *                             example: 677c3d4e5f6789abcdef012
 *                           applicantName:
 *                             type: string
 *                             example: John Doe
 *                           applicantEmail:
 *                             type: string
 *                             example: john@gmail.com
 *                           applicantPhoneNumber:
 *                             type: string
 *                             example: "251962212818"
 *                           submittedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-01-12T12:00:00Z"
 *                           isSaved:
 *                             type: boolean
 *                             example: true
 *                             description: Admin has bookmarked/saved this application
 *                           isInvited:
 *                             type: boolean
 *                             example: false
 *                             description: Interview invitation has been sent
 *                           isAccepted:
 *                             type: boolean
 *                             example: false
 *                             description: Acceptance email has been sent
 *             examples:
 *               allResponses:
 *                 summary: All applications (no filter)
 *                 value:
 *                   success: true
 *                   message: Responses retrieved successfully
 *                   data:
 *                     total: 10
 *                     filters:
 *                       isSaved: null
 *                       isInvited: null
 *                       isAccepted: null
 *                     responses: []
 *               savedOnly:
 *                 summary: Saved applications only
 *                 value:
 *                   success: true
 *                   message: Responses retrieved successfully
 *                   data:
 *                     total: 5
 *                     filters:
 *                       isSaved: "true"
 *                       isInvited: null
 *                       isAccepted: null
 *                     responses: []
 *               readyToInvite:
 *                 summary: Saved but not invited (ready to invite)
 *                 value:
 *                   success: true
 *                   message: Responses retrieved successfully
 *                   data:
 *                     total: 3
 *                     filters:
 *                       isSaved: "true"
 *                       isInvited: "false"
 *                       isAccepted: null
 *                     responses: []
 *               inInterviewProcess:
 *                 summary: Invited but not accepted (in interview process)
 *                 value:
 *                   success: true
 *                   message: Responses retrieved successfully
 *                   data:
 *                     total: 2
 *                     filters:
 *                       isSaved: null
 *                       isInvited: "true"
 *                       isAccepted: "false"
 *                     responses: []
 *               hiredCandidates:
 *                 summary: Accepted candidates (hired)
 *                 value:
 *                   success: true
 *                   message: Responses retrieved successfully
 *                   data:
 *                     total: 1
 *                     filters:
 *                       isSaved: null
 *                       isInvited: null
 *                       isAccepted: "true"
 *                     responses: []
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
 *       Saved applications can be filtered using `?isSaved=true` query parameter.
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     responseId:
 *                       type: string
 *                       example: 677c3d4e5f6789abcdef012
 *                     isSaved:
 *                       type: boolean
 *                       example: true
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
 *       
 *       After sending, filter invited candidates using `?isInvited=true` query parameter.
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     responseId:
 *                       type: string
 *                       example: 677c3d4e5f6789abcdef012
 *                     isInvited:
 *                       type: boolean
 *                       example: true
 *                     interviewDetails:
 *                       type: object
 *                       properties:
 *                         date:
 *                           type: string
 *                           format: date-time
 *                         time:
 *                           type: string
 *                         meetLink:
 *                           type: string
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
 *       
 *       After sending, filter accepted candidates using `?isAccepted=true` query parameter.
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     responseId:
 *                       type: string
 *                       example: 677c3d4e5f6789abcdef012
 *                     isAccepted:
 *                       type: boolean
 *                       example: true
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