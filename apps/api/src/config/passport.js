'use strict';

/**
 * Passport.js configuration — Google OAuth 2.0 strategy.
 *
 * GOOGLE OAUTH SETUP INSTRUCTIONS:
 * ─────────────────────────────────────────────────────────────────
 * 1. Go to https://console.cloud.google.com
 * 2. Create a new project called "ClipSync"
 * 3. Enable the "Google People API" (or "Google+ API")
 * 4. Navigate to APIs & Services → Credentials
 * 5. Click "Create Credentials" → OAuth 2.0 Client ID
 * 6. Application type: Web application
 * 7. Authorized redirect URIs:
 *      http://localhost:4000/api/auth/google/callback   (dev)
 *      https://yourdomain.com/api/auth/google/callback  (prod)
 * 8. Copy the Client ID and Client Secret into .env:
 *      GOOGLE_CLIENT_ID=...
 *      GOOGLE_CLIENT_SECRET=...
 *      GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
 * ─────────────────────────────────────────────────────────────────
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { findOrCreateGoogleUser } = require('../services/auth.service');

// Minimal session serialisation — we use JWT for stateless auth;
// sessions are only used transiently during the OAuth redirect flow.
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  done(null, { id });
});

// Only register the Google strategy if credentials are configured.
// This allows the app to run in email/password-only mode without errors.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName || 'User';
          const avatarUrl = profile.photos?.[0]?.value || null;

          if (!email) {
            return done(new Error('Google account has no associated email address.'));
          }

          const user = await findOrCreateGoogleUser({ googleId, email, name, avatarUrl });
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  console.log('[Passport] Google OAuth strategy registered.');
} else {
  console.warn('[Passport] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google OAuth disabled.');
}

module.exports = passport;
