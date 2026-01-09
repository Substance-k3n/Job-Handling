const express = require('express');
const router = express.Router();
const publicJobController = require('../controllers/publicJobController');
const applicationController = require('../controllers/applicationController');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const { upload, uploadToMinio } = require('../config/multer');

/**
 * @swagger
 * /jobs:
 *   get:
 *     tags: [Jobs - Public]
 *     summary: STEP 1 - Fetch all available jobs (PUBLIC - No Authentication)
 *     description: |
 *       Fetch all publicly visible jobs for the talent/user side.
 *       
 *       **Job Visibility Rules:**
 *       A job is visible if ALL conditions are met:
 *       - `status === 'ACTIVE'`
 *       - Current time >= `validFrom`
 *       - Current time <= `validTo`
 *       
 *       **Performance Note:**
 *       Returns only job metadata (title, short description, dates).
 *       To get full details and form fields, call GET /jobs/:jobId
 *       
 *       **NO AUTHENTICATION REQUIRED** - Anyone can view jobs
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
 *                       id:
 *                         type: string
 *                         description: Job ID
 *                         example: 677a1b2c3d4e5f6789abcdef
 *                       title:
 *                         type: string
 *                         description: Job title
 *                         example: Frontend Developer
 *                       shortDescription:
 *                         type: string
 *                         description: First 100 characters of job description
 *                         example: We are hiring a React developer with 3+ years of experience. Must know TypeScript, React hooks...
 *                       validFrom:
 *                         type: string
 *                         format: date-time
 *                         description: Job starts accepting applications from this date
 *                         example: "2026-01-12T10:00:00Z"
 *                       validTo:
 *                         type: string
 *                         format: date-time
 *                         description: Job stops accepting applications after this date
 *                         example: "2026-01-31T23:59:59Z"
 *             examples:
 *               multipleJobs:
 *                 summary: Multiple Active Jobs
 *                 value:
 *                   success: true
 *                   message: Jobs retrieved successfully
 *                   data:
 *                     - id: 677a1b2c3d4e5f6789abcdef
 *                       title: Frontend Developer
 *                       shortDescription: We are hiring a React developer with 3+ years of experience. Must know TypeScript, React hooks...
 *                       validFrom: "2026-01-12T10:00:00Z"
 *                       validTo: "2026-01-31T23:59:59Z"
 *                     - id: 677a1b2c3d4e5f6789abcdf0
 *                       title: Backend Developer
 *                       shortDescription: Looking for Node.js developer with experience in microservices and PostgreSQL...
 *                       validFrom: "2026-01-15T10:00:00Z"
 *                       validTo: "2026-02-15T23:59:59Z"
 *               noJobs:
 *                 summary: No Active Jobs
 *                 value:
 *                   success: true
 *                   message: Jobs retrieved successfully
 *                   data: []
 */
router.get('/jobs', publicJobController.getPublicJobs);

/**
 * @swagger
 * /jobs/{jobId}:
 *   get:
 *     tags: [Jobs - Public]
 *     summary: STEP 2 - Fetch single job with complete form schema (PUBLIC - No Authentication)
 *     description: |
 *       Fetch detailed job information including all application form fields.
 *       
 *       **Returns:**
 *       - Complete job description (not truncated)
 *       - All form fields with their configuration
 *       - Field types, questions, options, required status
 *       - Fields are sorted by the `order` property
 *       
 *       **Use Case:**
 *       Frontend uses this response to dynamically render the job application form.
 *       Each field type (short_answer, multiple_choice, file, etc.) should be 
 *       rendered as the appropriate UI component.
 *       
 *       **NO AUTHENTICATION REQUIRED** - Anyone can view job details
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
 *         description: Job retrieved successfully with form schema
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
 *                       example: 677a1b2c3d4e5f6789abcdef
 *                     title:
 *                       type: string
 *                       example: Frontend Developer
 *                     description:
 *                       type: string
 *                       example: We are hiring a React developer with 3+ years of experience. Must know TypeScript, React hooks, and state management. You will work on building scalable web applications.
 *                     fields:
 *                       type: array
 *                       description: Form fields sorted by order property
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: Field ID - use this when submitting answers
 *                             example: 677b2c3d4e5f6789abcdef01
 *                           type:
 *                             type: string
 *                             enum: [short_answer, paragraph, multiple_choice, checkboxes, dropdown, file, rating, date, time]
 *                             description: Field type determines UI component to render
 *                             example: short_answer
 *                           question:
 *                             type: string
 *                             description: Question text to display
 *                             example: What is your full name?
 *                           options:
 *                             type: array
 *                             items:
 *                               type: string
 *                             description: Options for multiple_choice, checkboxes, dropdown (empty for other types)
 *                             example: []
 *                           required:
 *                             type: boolean
 *                             description: Whether this field must be filled
 *                             example: true
 *                           order:
 *                             type: number
 *                             description: Display order (fields are pre-sorted)
 *                             example: 1
 *             examples:
 *               completeJob:
 *                 summary: Job with Multiple Field Types
 *                 value:
 *                   success: true
 *                   message: Job retrieved successfully
 *                   data:
 *                     id: 677a1b2c3d4e5f6789abcdef
 *                     title: Frontend Developer
 *                     description: We are hiring a React developer with 3+ years of experience. Must know TypeScript, React hooks, and state management.
 *                     fields:
 *                       - id: 677b2c3d4e5f6789abcdef01
 *                         type: short_answer
 *                         question: What is your full name?
 *                         options: []
 *                         required: true
 *                         order: 1
 *                       - id: 677b2c3d4e5f6789abcdef02
 *                         type: file
 *                         question: Upload your CV/Resume
 *                         options: []
 *                         required: true
 *                         order: 2
 *                       - id: 677b2c3d4e5f6789abcdef03
 *                         type: multiple_choice
 *                         question: Years of Experience
 *                         options: ["0-1", "2-3", "4-5", "5+"]
 *                         required: true
 *                         order: 3
 *                       - id: 677b2c3d4e5f6789abcdef04
 *                         type: paragraph
 *                         question: Why do you want to join our company?
 *                         options: []
 *                         required: false
 *                         order: 4
 *                       - id: 677b2c3d4e5f6789abcdef05
 *                         type: checkboxes
 *                         question: Which technologies do you know?
 *                         options: ["React", "Node.js", "TypeScript", "MongoDB", "PostgreSQL"]
 *                         required: false
 *                         order: 5
 *                       - id: 677b2c3d4e5f6789abcdef06
 *                         type: date
 *                         question: When can you start?
 *                         options: []
 *                         required: true
 *                         order: 6
 *       403:
 *         description: Job is no longer available (INACTIVE or outside date range)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: This job is no longer available
 *             example:
 *               success: false
 *               message: This job is no longer available
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Job not found
 */
router.get('/jobs/:jobId', publicJobController.getPublicJobById);

/**
 * @swagger
 * /jobs/{jobId}/apply:
 *   post:
 *     tags: [Applications - Public]
 *     summary: STEP 3 - Apply for a job (CRITICAL - PUBLIC - No Authentication)
 *     description: |
 *       Submit a job application with form answers and optional CV upload.
 *       
 *       **CRITICAL REQUIREMENTS:**
 *       
 *       **1. Applicant Object (ALWAYS REQUIRED):**
 *       Frontend must ALWAYS collect these fields:
 *       - `name` (string, required)
 *       - `email` (string, required) - used for duplicate detection
 *       - `phoneNumber` (string, required)
 *       - `country` (string, required)
 *       - `city` (string, required)
 *       
 *       **2. Answers Array:**
 *       - Array of objects with `fieldId` and `value`
 *       - `fieldId`: Must match field IDs from GET /jobs/:jobId response
 *       - `value`: Can be string OR array (for checkboxes)
 *       - File field values are auto-populated by backend (don't include in answers)
 *       
 *       **3. File Upload (Optional but Recommended):**
 *       - If job has a file field, user can upload CV
 *       - Field name: `cv` (single file)
 *       - Must also send `fileFieldId` to specify which field it belongs to
 *       - Accepted formats: PDF, DOC, DOCX
 *       - Maximum size: 5MB
 *       - File is uploaded to MinIO cloud storage
 *       
 *       **4. Duplicate Prevention:**
 *       - User can only apply ONCE per job
 *       - Duplicate check is done by email address
 *       - Returns error code "DUPLICATE_APPLICATION" if already applied
 *       
 *       **5. Request Format:**
 *       - Content-Type: multipart/form-data
 *       - `applicant`: JSON string
 *       - `answers`: JSON string (array)
 *       - `cv`: File (optional)
 *       - `fileFieldId`: String (required if cv is provided)
 *       
 *       **NO AUTHENTICATION REQUIRED** - Anyone can apply
 *       
 *       **Frontend Integration Example:**
 *       ```javascript
 *       const formData = new FormData();
 *       
 *       // Applicant info (ALWAYS REQUIRED)
 *       formData.append('applicant', JSON.stringify({
 *         name: "John Doe",
 *         email: "john.doe@gmail.com",
 *         phoneNumber: "251962212818",
 *         country: "Ethiopia",
 *         city: "Addis Ababa"
 *       }));
 *       
 *       // Form field answers
 *       formData.append('answers', JSON.stringify([
 *         { fieldId: "field_1", value: "John Doe" },
 *         { fieldId: "field_3", value: "5+" },
 *         { fieldId: "field_5", value: ["React", "TypeScript"] } // array for checkboxes
 *       ]));
 *       
 *       // CV file (if job requires it)
 *       if (cvFile) {
 *         formData.append('cv', cvFile);
 *         formData.append('fileFieldId', 'field_2');
 *       }
 *       
 *       fetch('/jobs/JOB_ID/apply', {
 *         method: 'POST',
 *         body: formData
 *       });
 *       ```
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - applicant
 *               - answers
 *             properties:
 *               applicant:
 *                 type: string
 *                 description: |
 *                   JSON string containing applicant information.
 *                   All fields are required!
 *                 example: '{"name":"John Doe","email":"john.doe@gmail.com","phoneNumber":"251962212818","country":"Ethiopia","city":"Addis Ababa"}'
 *               answers:
 *                 type: string
 *                 description: |
 *                   JSON string array of field answers.
 *                   Each answer has fieldId and value.
 *                   For checkboxes, value is an array.
 *                   Don't include file fields - backend handles those.
 *                 example: '[{"fieldId":"677b2c3d4e5f6789abcdef01","value":"John Doe"},{"fieldId":"677b2c3d4e5f6789abcdef03","value":"5+"},{"fieldId":"677b2c3d4e5f6789abcdef05","value":["React","TypeScript","MongoDB"]}]'
 *               cv:
 *                 type: string
 *                 format: binary
 *                 description: |
 *                   CV/Resume file (PDF, DOC, DOCX)
 *                   Maximum size: 5MB
 *                   Optional - only if job has a file field
 *               fileFieldId:
 *                 type: string
 *                 description: |
 *                   Field ID where the CV should be attached.
 *                   Required if cv is provided.
 *                   Must match a field of type 'file' from the job form.
 *                 example: 677b2c3d4e5f6789abcdef02
 *           encoding:
 *             applicant:
 *               contentType: application/json
 *             answers:
 *               contentType: application/json
 *           examples:
 *             withCV:
 *               summary: Application with CV Upload
 *               value:
 *                 applicant: '{"name":"John Doe","email":"john.doe@gmail.com","phoneNumber":"251962212818","country":"Ethiopia","city":"Addis Ababa"}'
 *                 answers: '[{"fieldId":"677b2c3d4e5f6789abcdef01","value":"John Doe"},{"fieldId":"677b2c3d4e5f6789abcdef03","value":"5+"},{"fieldId":"677b2c3d4e5f6789abcdef04","value":"I am passionate about React"},{"fieldId":"677b2c3d4e5f6789abcdef05","value":["React","TypeScript"]},{"fieldId":"677b2c3d4e5f6789abcdef06","value":"2026-02-01"}]'
 *                 cv: (binary file)
 *                 fileFieldId: 677b2c3d4e5f6789abcdef02
 *             withoutCV:
 *               summary: Application without CV Upload
 *               value:
 *                 applicant: '{"name":"Jane Smith","email":"jane.smith@gmail.com","phoneNumber":"251912345678","country":"Ethiopia","city":"Addis Ababa"}'
 *                 answers: '[{"fieldId":"677b2c3d4e5f6789abcdef01","value":"Jane Smith"},{"fieldId":"677b2c3d4e5f6789abcdef03","value":"2-3"}]'
 *     responses:
 *       201:
 *         description: Application submitted successfully
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
 *                   example: Application submitted successfully
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     applicationId:
 *                       type: string
 *                       description: ID of the created application
 *                       example: 677c1b2c3d4e5f6789abcde0
 *                     cvUrl:
 *                       type: string
 *                       nullable: true
 *                       description: Public MinIO URL of the uploaded CV (null if no file uploaded)
 *                       example: http://localhost:9000/job-uploads/cv-1736432960000-john_doe_cv.pdf
 *             example:
 *               success: true
 *               message: Application submitted successfully
 *               data:
 *                 applicationId: 677c1b2c3d4e5f6789abcde0
 *                 cvUrl: http://localhost:9000/job-uploads/cv-1736432960000-john_doe_cv.pdf
 *       400:
 *         description: Bad request - validation error or duplicate application
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   description: Error code (only for specific errors)
 *                   example: DUPLICATE_APPLICATION
 *                 message:
 *                   type: string
 *                   example: You have already applied for this job.
 *             examples:
 *               duplicateApplication:
 *                 summary: Duplicate Application (Same Email)
 *                 value:
 *                   success: false
 *                   code: DUPLICATE_APPLICATION
 *                   message: You have already applied for this job.
 *               missingFields:
 *                 summary: Missing Required Applicant Fields
 *                 value:
 *                   success: false
 *                   message: Name, email, phone number, country, and city are required
 *               invalidEmail:
 *                 summary: Invalid Email Format
 *                 value:
 *                   success: false
 *                   message: Invalid email format
 *               fileTooLarge:
 *                 summary: File Size Exceeds Limit
 *                 value:
 *                   success: false
 *                   message: File size exceeds 5MB limit
 *               invalidFileType:
 *                 summary: Invalid File Type
 *                 value:
 *                   success: false
 *                   message: Only PDF and DOC/DOCX files are allowed
 *       403:
 *         description: Job is no longer accepting applications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: This job is no longer accepting applications
 *             example:
 *               success: false
 *               message: This job is no longer accepting applications
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Job not found
 *       413:
 *         description: File too large (exceeds 5MB)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: File too large
 */
router.post(
  '/jobs/:jobId/apply', 
  upload.single('cv'),      // Handle CV file upload
  uploadToMinio,            // Upload to MinIO cloud storage (not local disk)
  applicationController.applyForJob
);

module.exports = router;