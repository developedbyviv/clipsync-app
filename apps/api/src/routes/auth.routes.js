'use strict';

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const passport = require('../config/passport');
const { register, login, logout, getMe, googleCallback } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/authenticate');

const router = Router();

// ── Stricter rate limiters for auth endpoints ─────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Too many login attempts. Please try again in 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Too many registration attempts. Please try again in an hour.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

// ── Routes ────────────────────────────────────────────────────────────────────

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

// Google OAuth — only mount if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  router.get(
    '/google/callback',
    passport.authenticate('google', {
      failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google_failed`,
      session: true,
    }),
    googleCallback
  );
} else {
  // Friendly error if Google OAuth not configured
  router.get('/google', (req, res) => {
    res.status(501).json({
      error: true,
      message: 'Google OAuth is not configured on this server.',
      code: 'OAUTH_NOT_CONFIGURED',
    });
  });
}

module.exports = router;
