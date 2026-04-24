'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const COOKIE_NAME = 'clipsync_token';
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '7d';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Strip sensitive fields — never return password_hash in a response.
 */
function stripUser(user) {
  const raw = user.toJSON ? user.toJSON() : user;
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    avatarUrl: raw.avatar_url || null,
    createdAt: raw.created_at,
  };
}

/**
 * Generate a signed JWT for the given user.
 */
function generateToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required.');

  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    secret,
    { expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * Set the auth cookie on the response.
 */
function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SEVEN_DAYS_MS,
  });
}

/**
 * Clear the auth cookie.
 */
function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

/**
 * Register a new user with email and password.
 */
async function registerUser({ name, email, password }) {
  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) {
    const err = new Error('An account with this email already exists.');
    err.code = 'EMAIL_TAKEN';
    err.statusCode = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password_hash,
  });

  return stripUser(user);
}

/**
 * Authenticate an existing user with email and password.
 */
async function loginUser({ email, password }) {
  // Use withPassword scope to include password_hash for comparison
  const user = await User.scope('withPassword').findOne({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    const err = new Error('No account found with that email address.');
    err.code = 'USER_NOT_FOUND';
    err.statusCode = 401;
    throw err;
  }

  if (!user.password_hash) {
    const err = new Error('This account uses Google Sign-In. Please continue with Google.');
    err.code = 'GOOGLE_ACCOUNT';
    err.statusCode = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Incorrect password.');
    err.code = 'INVALID_PASSWORD';
    err.statusCode = 401;
    throw err;
  }

  return stripUser(user);
}

/**
 * Find or create a user via Google OAuth.
 * Matches by google_id first, then email (for accounts that pre-existed).
 */
async function findOrCreateGoogleUser({ googleId, email, name, avatarUrl }) {
  // 1. Try to find by google_id
  let user = await User.findOne({ where: { google_id: googleId } });

  if (user) {
    // Update profile in case name/avatar changed on Google
    await user.update({ name, avatar_url: avatarUrl });
    return stripUser(user);
  }

  // 2. Try to find by email (existing email/password account)
  user = await User.findOne({ where: { email: email.toLowerCase() } });

  if (user) {
    // Link the Google account to the existing account
    await user.update({ google_id: googleId, avatar_url: avatarUrl, name });
    return stripUser(user);
  }

  // 3. Create new user
  user = await User.create({
    name,
    email: email.toLowerCase(),
    google_id: googleId,
    avatar_url: avatarUrl,
  });

  return stripUser(user);
}

module.exports = {
  registerUser,
  loginUser,
  findOrCreateGoogleUser,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  stripUser,
};
