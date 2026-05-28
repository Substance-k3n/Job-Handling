const express = require('express');
const router = express.Router();
const { getDashboardStats, getActivity } = require('../controllers/statsController');
const { protect } = require('../middleware/authMiddleware');

// Protected — requires auth
router.get('/dashboard', protect, getDashboardStats);
router.get('/activity', protect, getActivity);

module.exports = router;
