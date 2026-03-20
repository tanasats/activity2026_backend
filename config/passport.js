const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    const email = profile.emails[0].value;
    const name = profile.displayName;
    const picture = profile.photos[0].value;

    try {
      let user = await User.findByEmail(email);
      
      // Logic for determining role (moved to here from route for consistency)
      const getRoleFromEmail = (email) => {
        if (email.endsWith('@msu.ac.th')) {
          const prefix = email.split('@')[0];
          if (/^\d+$/.test(prefix)) return 'student';
          return 'staff';
        }
        return 'guest';
      };

      if (!user) {
        let facultyCode = null;
        if (email.endsWith('@msu.ac.th')) {
          const prefix = email.split('@')[0];
          if (/^\d{11}$/.test(prefix)) {
            // Student ID format: e.g., 65010999001
            // Check from characters 5-6 (index 4-5) as requested
            facultyCode = prefix.substring(4, 6);
          }
        }

        const determinedRole = getRoleFromEmail(email);
        user = await User.create(email, name, picture, determinedRole, facultyCode);
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// Note: We don't need serialize/deserialize if we only use JWT
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;
