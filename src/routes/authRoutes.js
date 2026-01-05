const express = require('express');
const { login, getMe } = require('../controllers/authController');
const { loginValidator } = require('../validators/authValidator');
const validateRequest = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Admin login
 *     description: Authenticate admin user and receive JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Invalid email or password
 */
router.post('/login', loginValidator, validateRequest, login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current authenticated user
 *     description: Retrieve profile information of the currently logged-in user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                   example: User profile retrieved
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
router.get('/me', protect, getMe);

module.exports = router;