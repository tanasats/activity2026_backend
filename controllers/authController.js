const jwt = require('jsonwebtoken');
const passport = require('passport');
const db = require('../config/db');

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
    }, async (err, user) => {
      if (err || !user) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
      }

      try {
        // Create Access Token (short-lived - 1 hour)
        const accessToken = jwt.sign(
          { id: user.id, email: user.email, role: user.role, faculty_code: user.faculty_code },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        // Create Refresh Token (long-lived - 7 days)
        const refreshToken = jwt.sign(
          { id: user.id },
          process.env.REFRESH_TOKEN_SECRET,
          { expiresIn: '7d' }
        );

        // Store Refresh Token in DB
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await db.query(
          'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
          [user.id, refreshToken, expiresAt]
        );

        // Redirect to frontend with tokens and user info
        const userData = encodeURIComponent(JSON.stringify({
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          faculty_code: user.faculty_code,
          faculty_name: user.faculty_name,
          profile_image: user.profile_image
        }));

        res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${accessToken}&refreshToken=${refreshToken}&user=${userData}`);
      } catch (dbErr) {
        console.error('Error during token generation/storage:', dbErr);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
      }
    })(req, res, next);
  },

  /**
   * Refreshes the Access Token using a Refresh Token
   */
  refresh: async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    try {
      // 1. Verify Refresh Token signature
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

      // 2. Check if Refresh Token exists in DB and is not expired
      const result = await db.query(
        'SELECT r.*, u.email, u.role, u.faculty_code FROM refresh_tokens r JOIN userauth u ON r.user_id = u.id WHERE r.token = $1 AND r.expires_at > NOW()',
        [refreshToken]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid or expired refresh token' });
      }

      const user = result.rows[0];

      // 3. Issue new Access Token
      const newAccessToken = jwt.sign(
        { id: user.user_id, email: user.email, role: user.role, faculty_code: user.faculty_code },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({ accessToken: newAccessToken });
    } catch (err) {
      console.error('Refresh token error:', err);
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
  },

  /**
   * Logs out user by revoking the Refresh Token
   */
  logout: async (req, res) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
      try {
        await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
      } catch (err) {
        console.error('Error during logout/token revocation:', err);
      }
    }

    res.json({ message: 'Logged out successfully' });
  },

  /**
   * Deprecated mock login endpoint
   */
  deprecatedLogin: (req, res) => {
    res.status(410).json({ message: 'This endpoint is deprecated. Use /api/auth/google' });
  }
};

module.exports = authController;

