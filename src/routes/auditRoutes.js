
const express = require('express');
const router = express.Router();
const { getAllLogs, getResourceLogs, getMyActivity } = require('../controllers/auditController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', protect, authorize('admin'), getAllLogs);


router.get('/:resource/:resourceId', protect, authorize('admin'), getResourceLogs);

module.exports = router;