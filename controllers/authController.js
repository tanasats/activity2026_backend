const jwt = require('jsonwebtoken');
const passport = require('passport');

/**
 * Controller for Authentication
 */
const authController = {
  /**
   * Initiates Google OAuth flow
   */
  googleLogin: passport.authenticate('google', {
    scope: ['profile', 'email']
  }),

  /**
   * Handles Google OAuth callback
   */
  googleCallback: (req, res, next) => {
    passport.authenticate('google', {
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
      session: false
    }, (err, user) => {
      if (err || !user) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
      }

      // On success, create JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, faculty_code: user.faculty_code },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      // Redirect to frontend with token and user info
      const userData = encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        faculty_code: user.faculty_code,
        faculty_name: user.faculty_name,
        profile_image: user.profile_image
      }));

      res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${token}&user=${userData}`);
    })(req, res, next);
  },

  /**
   * Deprecated mock login endpoint
   */
  deprecatedLogin: (req, res) => {
    res.status(410).json({ message: 'This endpoint is deprecated. Use /api/auth/google' });
  }
};

module.exports = authController;
