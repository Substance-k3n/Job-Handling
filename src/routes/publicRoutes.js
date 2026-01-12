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
 *     summary: STEP 1 - Fetch all available jobs with full metadata (PUBLIC - No Authentication)
 *     description: |
 *       Fetch all publicly visible jobs for the talent/user side.
 *       
 *       Returns full job metadata for each job (title, full description, location, type,
 *       work mode, key responsibilities, what we offer, requirements, deadline).
 *       Application form fields are NOT included here; to get fields for a specific job,
 *       use GET /jobs/{jobId} which returns both metadata and fields.
 *       
 *       Visibility: Only jobs that are ACTIVE and not past their deadline are returned.
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
 *                         example: Software Engineer
 *                       description:
 *                         type: string
 *                         description: Full job description
 *                         example: We are looking for a skilled Software Engineer to join our growing development team. The ideal candidate will have strong problem-solving skills and experience in modern web technologies.
 *                       location:
 *                         type: string
 *                         example: Addis Ababa, Ethiopia
 *                       type:
 *                         type: string
 *                         example: full-time
 *                       work_mode:
 *                         type: string
 *                         example: hybrid
 *                       key_responsibilities:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: [
 *                           "Develop and maintain web applications",
 *                           "Collaborate with cross-functional teams",
 *                           "Write clean, scalable code"
 *                         ]
 *                       what_we_offer:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: [
 *                           "Competitive salary",
 *                           "Health and dental insurance"
 *                         ]
 *                       requirements:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: [
 *                           "Bachelor's degree in Computer Science or related field",
 *                           "3+ years of experience in software development"
 *                         ]
 *                       deadline:
 *                         type: string
 *                         format: date-time
 *                         description: Job application deadline
 *                         example: "2026-02-15T17:00:00Z"
 *             examples:
 *               multipleJobs:
 *                 summary: Multiple Active Jobs (full metadata)
 *                 value:
 *                   success: true
 *                   message: Jobs retrieved successfully
 *                   data:
 *                     - id: 677a1b2c3d4e5f6789abcdef
 *                       title: Software Engineer
 *                       description: We are looking for a skilled Software Engineer to join our growing development team.
 *                       location: Addis Ababa, Ethiopia
 *                       type: full-time
 *                       work_mode: hybrid
 *                       key_responsibilities: [
 *                         "Develop and maintain web applications",
 *                         "Collaborate with cross-functional teams"
 *                       ]
 *                       what_we_offer: [
 *                         "Competitive salary",
 *                         "Health and dental insurance"
 *                       ]
 *                       requirements: [
 *                         "Bachelor's degree in Computer Science or related field",
 *                         "3+ years of experience in software development"
 *                       ]
 *                       deadline: "2026-02-15T17:00:00Z"
 *                     - id: 677a1b2c3d4e5f6789abcdf0
 *                       title: Backend Developer
 *                       description: Looking for Node.js developer with experience in microservices and PostgreSQL.
 *                       location: Addis Ababa, Ethiopia
 *                       type: full-time
 *                       work_mode: onsite
 *                       key_responsibilities: [
 *                         "Design and implement REST APIs"
 *                       ]
 *                       what_we_offer: [
 *                         "Health and dental insurance"
 *                       ]
 *                       requirements: [
 *                         "Experience with Node.js and PostgreSQL"
 *                       ]
 *                       deadline: "2026-03-01T17:00:00Z"
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
 *       - Full job metadata (not truncated)
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
 *                       example: We are looking for a skilled Software Engineer to join our growing development team. The ideal candidate will have strong problem-solving skills and experience in modern web technologies.
 *                     location:
 *                       type: string
 *                       example: Addis Ababa, Ethiopia
 *                     type:
 *                       type: string
 *                       example: full-time
 *                     work_mode:
 *                       type: string
 *                       example: hybrid
 *                     key_responsibilities:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [
 *                         "Develop and maintain web applications",
 *                         "Collaborate with cross-functional teams",
 *                         "Write clean, scalable code",
 *                         "Participate in code reviews",
 *                         "Troubleshoot and debug issues"
 *                       ]
 *                     what_we_offer:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [
 *                         "Competitive salary",
 *                         "Health and dental insurance",
 *                         "Remote work flexibility",
 *                         "Professional development opportunities",
 *                         "Generous vacation policy"
 *                       ]
 *                     requirements:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [
 *                         "Bachelor's degree in Computer Science or related field",
 *                         "3+ years of experience in software development",
 *                         "Proficiency in JavaScript, React, and Node.js",
 *                         "Strong problem-solving skills",
 *                         "Excellent communication and teamwork abilities"
 *                       ]
 *                     deadline:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-02-15T17:00:00Z"
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
 *                     title: Software Engineer
 *                     description: We are looking for a skilled Software Engineer to join our growing development team. The ideal candidate will have strong problem-solving skills and experience in modern web technologies.
 *                     location: Addis Ababa, Ethiopia
 *                     type: full-time
 *                     work_mode: hybrid
 *                     key_responsibilities: [
 *                       "Develop and maintain web applications",
 *                       "Collaborate with cross-functional teams",
 *                       "Write clean, scalable code",
 *                       "Participate in code reviews",
 *                       "Troubleshoot and debug issues"
 *                     ]
 *                     what_we_offer: [
 *                       "Competitive salary",
 *                       "Health and dental insurance",
 *                       "Remote work flexibility",
 *                       "Professional development opportunities",
 *                       "Generous vacation policy"
 *                     ]
 *                     requirements: [
 *                       "Bachelor's degree in Computer Science or related field",
 *                       "3+ years of experience in software development",
 *                       "Proficiency in JavaScript, React, and Node.js",
 *                       "Strong problem-solving skills",
 *                       "Excellent communication and teamwork abilities"
 *                     ]
 *                     deadline: "2026-02-15T17:00:00Z"
 *                     fields: [
 *                       {
 *                         id: "677b2c3d4e5f6789abcdef01",
 *                         type: "short_answer",
 *                         question: "What is your full name?",
 *                         options: [],
 *                         required: true,
 *                         order: 1
 *                       },
 *                       {
 *                         id: "677b2c3d4e5f6789abcdef02",
 *                         type: "file",
 *                         question: "Upload your CV/Resume",
 *                         options: [],
 *                         required: true,
 *                         order: 2
 *                       }
 *                     ]
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
 * /files/upload:
 *   post:
 *     tags: [Applications - Public]
 *     summary: Upload a file to MinIO and get public URL (generic)
 *     description: |
 *       Simple utility endpoint to upload **any single file** to MinIO and get back
 *       a public URL. This can be reused from other sites/frontends that just need
 *       a MinIO-hosted file URL.
 *
 *       **Notes:**
 *       - Field name must be `file`
 *       - Uses the same MinIO bucket and config as job applications (`job-uploads`)
 *       - Accepted formats are controlled by backend multer config (PDF, DOC, DOCX)
 *       - Max size is 5MB
 *
 *       **NO AUTHENTICATION REQUIRED** by default.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *           examples:
 *             sampleFile:
 *               summary: Example file upload
 *               value:
 *                 file: (binary file)
 *     responses:
 *       201:
 *         description: File uploaded successfully
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
 *                   example: File uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     fileName:
 *                       type: string
 *                       example: my_cv.pdf
 *                     bucket:
 *                       type: string
 *                       example: job-uploads
 *                     objectName:
 *                       type: string
 *                       example: cv-1736432960000-my_cv.pdf
 *                     url:
 *                       type: string
 *                       description: Public MinIO URL to access the file
 *                       example: http://localhost:9000/job-uploads/cv-1736432960000-my_cv.pdf
 *       400:
 *         description: No file provided or upload failed
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
 *                   example: No file uploaded or upload failed
 */
router.post(
  '/files/upload',
  upload.single('file'),
  uploadToMinio,
  (req, res) => {
    if (!req.file || !req.file.minioUrl) {
      return errorResponse(res, 400, 'No file uploaded or upload failed');
    }

    return successResponse(res, 201, 'File uploaded successfully', {
      fileName: req.file.originalname,
      bucket: req.file.minioBucket,
      objectName: req.file.minioFileName,
      url: req.file.minioUrl
    });
  }
);

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