/**
 * @swagger
 * tags:
 *   - name: Audit
 *     description: System audit logging and retrieval
 */
const express = require('express');
const router = express.Router();
const { getAllLogs, getResourceLogs, getMyActivity } = require('../controllers/auditController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * @swagger
 * /api/audit/my-activity:
 *   get:
 *     summary: Get the current user's audit activity
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: User activity retrieved
 *       401:
 *         description: Unauthorized
 */
// Get my activity (any authenticated user)
router.get('/my-activity', protect, getMyActivity);

/**
 * @swagger
 * /api/audit:
 *   get:
 *     summary: Get all system audit logs (Admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *         description: Filter by resource type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for range filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for range filter
 *     responses:
 *       200:
 *         description: Audit logs retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
// Admin-only routes
router.get('/', protect, authorize('admin'), getAllLogs);

/**
 * @swagger
 * /api/audit/{resource}/{resourceId}:
 *   get:
 *     summary: Get audit logs for a specific resource
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource type (User, Job, Application, System)
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource ID
 *     responses:
 *       200:
 *         description: Audit logs for the resource retrieved
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/:resource/:resourceId', protect, authorize('admin'), getResourceLogs);

module.exports = router;