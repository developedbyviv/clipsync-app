'use strict';

const clipboardService = require('../services/clipboard.service');
const { clipboardCreatedTotal, clipboardRetrievedTotal } = require('../instrumentation/metrics');
const { getClient: getAIClient } = require('../instrumentation/appInsights');

/**
 * POST /api/clipboard
 * optionalAuth applied in routes — req.user may or may not exist.
 */
async function createClipboard(req, res, next) {
  try {
    const { content = '', expiresIn = '24h', readAndDestroy = false } = req.body;
    const userId = req.user?.userId || null;

    const result = await clipboardService.createClipboard({
      content: String(content),
      expiresIn: String(expiresIn),
      readAndDestroy: Boolean(readAndDestroy),
      userId,
    });

    // Track clipboard creation in Prometheus
    clipboardCreatedTotal.inc({
      expires_in: String(expiresIn),
      read_and_destroy: String(Boolean(readAndDestroy)),
      authenticated: String(!!req.user),
    });

    // Track as custom event in Application Insights
    const aiClient = getAIClient();
    if (aiClient) {
      aiClient.trackEvent({
        name: 'clipboard_created',
        properties: {
          expiresIn: String(expiresIn),
          readAndDestroy: String(Boolean(readAndDestroy)),
          authenticated: String(!!req.user),
        },
      });
    }

    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/clipboard/my-clipboards
 * requireAuth applied in routes.
 * Query params: ?page=1&limit=20
 */
async function getMyClipboards(req, res, next) {
  try {
    const userId = req.user.userId;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const result = await clipboardService.getMyClipboards(userId, page, limit);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/clipboard/:pin
 */
async function getClipboard(req, res, next) {
  try {
    const { pin } = req.params;

    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({
        error: true,
        message: 'PIN must be a 6-digit number.',
        code: 'INVALID_PIN_FORMAT',
      });
    }

    const clip = await clipboardService.getClipboard(pin);

    // Track successful retrieval
    clipboardRetrievedTotal.inc({ found: 'true', expired: 'false' });

    return res.status(200).json(clip);
  } catch (err) {
    // Track not-found / expired retrieval
    if (err.status === 404 || err.code === 'CLIPBOARD_NOT_FOUND') {
      clipboardRetrievedTotal.inc({ found: 'false', expired: 'false' });
    }
    return next(err);
  }
}

/**
 * DELETE /api/clipboard/:pin
 */
async function deleteClipboard(req, res, next) {
  try {
    const { pin } = req.params;

    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({
        error: true,
        message: 'PIN must be a 6-digit number.',
        code: 'INVALID_PIN_FORMAT',
      });
    }

    await clipboardService.deleteClipboard(pin);
    return res.status(200).json({ success: true, message: 'Clipboard deleted.' });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createClipboard,
  getMyClipboards,
  getClipboard,
  deleteClipboard,
};
