const express = require('express');
const router = express.Router();
const { getAllLogs } = require('../controllers/auditController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All audit routes are strictly Admin-only
router.use(protect);
router.use(authorize('admin'));

router.get('/', getAllLogs);

module.exports = router;