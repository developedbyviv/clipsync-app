'use strict';

const {
  registerUser,
  loginUser,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
} = require('../services/auth.service');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register
 * Body: { name, email, password }
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Input validation
    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return res.status(400).json({ error: true, message: 'Name is required.', code: 'VALIDATION_ERROR' });
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: true, message: 'A valid email address is required.', code: 'VALIDATION_ERROR' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: true, message: 'Password must be at least 8 characters.', code: 'VALIDATION_ERROR' });
    }

    const user = await registerUser({ name, email, password });
    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({ user });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: true, message: 'A valid email address is required.', code: 'VALIDATION_ERROR' });
    }
    if (!password) {
      return res.status(400).json({ error: true, message: 'Password is required.', code: 'VALIDATION_ERROR' });
    }

    const user = await loginUser({ email, password });
    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.status(200).json({ user });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/logout
 */
function logout(req, res) {
  clearAuthCookie(res);
  return res.status(200).json({ message: 'Logged out successfully.' });
}

/**
 * GET /api/auth/me
 * Protected — returns the authenticated user's profile.
 */
async function getMe(req, res, next) {
  try {
    const User = require('../models/user.model');
    const user = await User.findByPk(req.user.userId);

    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ error: true, message: 'User not found.', code: 'UNAUTHORIZED' });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatar_url || null,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/auth/google/callback
 * Passport populates req.user after Google strategy verifies.
 */
function googleCallback(req, res) {
  try {
    const { generateToken: genToken, setAuthCookie: setCookie } = require('../services/auth.service');
    const token = genToken(req.user);
    setCookie(res, token);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/dashboard`);
  } catch (err) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
}

module.exports = { register, login, logout, getMe, googleCallback };
