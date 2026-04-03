const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Google OAuth Login
router.get('/google', authController.googleLogin);

// Google OAuth Callback
router.get('/google/callback', authController.googleCallback);

// Refresh Token
router.post('/refresh', authController.refresh);

// Logout
router.post('/logout', authController.logout);

// Deprecated endpoint
router.post('/google-login', authController.deprecatedLogin);


module.exports = router;
