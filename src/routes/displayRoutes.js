const express = require('express');
const router = express.Router();
const { getDisplayProjects } = require('../controllers/displayController');

// Public — no auth required for display screens
router.get('/projects', getDisplayProjects);

module.exports = router;
