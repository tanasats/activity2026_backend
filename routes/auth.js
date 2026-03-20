const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Google OAuth Login
router.get('/google', authController.googleLogin);

// Google OAuth Callback
router.get('/google/callback', authController.googleCallback);

// Deprecated endpoint
router.post('/google-login', authController.deprecatedLogin);

module.exports = router;
