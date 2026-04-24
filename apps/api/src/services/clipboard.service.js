'use strict';

const { Op } = require('sequelize');
const Clipboard = require('../models/clipboard.model');
const redisClient = require('../config/redis');

/** TTL map: human-readable → seconds */
const EXPIRY_MAP = {
  '1h': 60 * 60,
  '24h': 24 * 60 * 60,
  '7d': 7 * 24 * 60 * 60,
};

const REDIS_PREFIX = 'clip:';

async function generateUniquePin(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const existing = await Clipboard.findOne({ where: { pin } });
    if (!existing) return pin;
  }
  throw new Error('Failed to generate unique PIN after multiple attempts');
}

function redisKey(pin) {
  return `${REDIS_PREFIX}${pin}`;
}

/**
 * Create a new clipboard entry.
 * @param {object} params
 * @param {string} params.content
 * @param {string} params.expiresIn — "1h" | "24h" | "7d"
 * @param {boolean} params.readAndDestroy
 * @param {string|null} params.userId — optional authenticated user ID
 */
async function createClipboard({ content = '', expiresIn = '24h', readAndDestroy = false, userId = null }) {
  const ttlSeconds = EXPIRY_MAP[expiresIn];
  if (!ttlSeconds) {
    const err = new Error(`Invalid expiresIn value: "${expiresIn}". Use 1h, 24h, or 7d.`);
    err.code = 'INVALID_EXPIRY';
    err.statusCode = 400;
    throw err;
  }

  if (content.length > 50000) {
    const err = new Error('Content exceeds the 50,000 character limit.');
    err.code = 'CONTENT_TOO_LARGE';
    err.statusCode = 400;
    throw err;
  }

  const pin = await generateUniquePin();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  const clip = await Clipboard.create({
    pin,
    content,
    expires_at: expiresAt,
    read_and_destroy: readAndDestroy,
    view_count: 0,
    user_id: userId || null,
  });

  await redisClient.setex(
    redisKey(pin),
    ttlSeconds,
    JSON.stringify({
      id: clip.id,
      pin: clip.pin,
      content: clip.content,
      expires_at: clip.expires_at,
      read_and_destroy: clip.read_and_destroy,
      view_count: clip.view_count,
      user_id: clip.user_id,
      created_at: clip.created_at,
      updated_at: clip.updated_at,
    })
  );

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return {
    pin: clip.pin,
    url: `${baseUrl}/clipboard/${clip.pin}`,
    expiresAt: clip.expires_at,
  };
}

/**
 * Retrieve a clipboard by PIN.
 * Checks Redis cache first; falls back to PostgreSQL.
 */
async function getClipboard(pin) {
  const cached = await redisClient.get(redisKey(pin));
  if (cached) {
    const clip = JSON.parse(cached);

    if (new Date(clip.expires_at) < new Date()) {
      await redisClient.del(redisKey(pin));
      const err = new Error('Clipboard has expired.');
      err.code = 'CLIPBOARD_EXPIRED';
      err.statusCode = 404;
      throw err;
    }

    if (clip.read_and_destroy) {
      await deleteClipboard(pin);
    } else {
      Clipboard.increment('view_count', { where: { pin } }).catch((e) =>
        console.error('[Service] Failed to increment view_count:', e.message)
      );
    }

    return clip;
  }

  const clip = await Clipboard.findOne({
    where: {
      pin,
      expires_at: { [Op.gt]: new Date() },
    },
  });

  if (!clip) {
    const err = new Error('Clipboard not found or has expired.');
    err.code = 'CLIPBOARD_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  if (clip.read_and_destroy) {
    await deleteClipboard(pin);
  } else {
    const remainingTtl = Math.floor((new Date(clip.expires_at) - Date.now()) / 1000);
    if (remainingTtl > 0) {
      await redisClient.setex(redisKey(pin), remainingTtl, JSON.stringify(clip.toJSON()));
    }
    await clip.increment('view_count');
  }

  return clip.toJSON();
}

/**
 * Update clipboard content (used by Socket.io handler).
 */
async function updateClipboard(pin, content) {
  if (content.length > 50000) {
    const err = new Error('Content exceeds the 50,000 character limit.');
    err.code = 'CONTENT_TOO_LARGE';
    err.statusCode = 400;
    throw err;
  }

  const clip = await Clipboard.findOne({ where: { pin } });

  if (!clip) {
    const err = new Error('Clipboard not found.');
    err.code = 'CLIPBOARD_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  clip.content = content;
  await clip.save();

  const remainingTtl = await redisClient.ttl(redisKey(pin));
  if (remainingTtl > 0) {
    await redisClient.setex(redisKey(pin), remainingTtl, JSON.stringify(clip.toJSON()));
  }

  return {
    content: clip.content,
    updatedAt: clip.updated_at,
  };
}

/**
 * Delete a clipboard by PIN from both PostgreSQL and Redis.
 */
async function deleteClipboard(pin) {
  await Promise.all([
    Clipboard.destroy({ where: { pin } }),
    redisClient.del(redisKey(pin)),
  ]);
}

/**
 * Get all clipboards belonging to an authenticated user (paginated).
 * Returns expired clipboards too — frontend handles display differentiation.
 * @param {string} userId
 * @param {number} page
 * @param {number} limit
 */
async function getMyClipboards(userId, page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const { count, rows } = await Clipboard.findAndCountAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return {
    clipboards: rows.map((c) => c.toJSON()),
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
}

module.exports = {
  createClipboard,
  getClipboard,
  updateClipboard,
  deleteClipboard,
  getMyClipboards,
};
