const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

// Get Dashboard Data based on Role
router.get('/dashboard', authenticateToken, reportController.getDashboardData);

// Get Activity Transcript (Student only)
router.get('/transcript', authenticateToken, reportController.getTranscript);

module.exports = router;
