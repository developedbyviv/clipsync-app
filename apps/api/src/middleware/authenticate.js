'use strict';

const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'clipsync_token';

/**
 * Verify the JWT from the httpOnly cookie and attach decoded user to req.user.
 * Returns 401 if token is missing or invalid.
 */
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required.',
        code: 'UNAUTHORIZED',
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured.');

    const decoded = jwt.verify(token, secret);
    req.user = decoded; // { userId, email, name, iat, exp }
    return next();
  } catch (err) {
    return res.status(401).json({
      error: true,
      message: 'Invalid or expired session. Please log in again.',
      code: 'UNAUTHORIZED',
    });
  }
}

/**
 * Attempts to verify the JWT and attaches req.user if successful.
 * Always calls next() — allows guest access.
 */
async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (token && process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
  } catch {
    // Invalid token — treat as guest, no error
    req.user = null;
  }
  return next();
}

module.exports = { requireAuth, optionalAuth };
