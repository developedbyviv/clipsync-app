'use strict';

const { Router } = require('express');
const {
  createClipboard,
  getMyClipboards,
  getClipboard,
  deleteClipboard,
} = require('../controllers/clipboard.controller');
const { requireAuth, optionalAuth } = require('../middleware/authenticate');

const router = Router();

// IMPORTANT: /my-clipboards MUST be registered before /:pin
// to prevent "my-clipboards" being matched as a PIN value.

// GET /api/clipboard/my-clipboards — authenticated user's clipboards
router.get('/my-clipboards', requireAuth, getMyClipboards);

// POST /api/clipboard — create (optionalAuth: saves to account if logged in)
router.post('/', optionalAuth, createClipboard);

// GET /api/clipboard/:pin — retrieve by PIN
router.get('/:pin', getClipboard);

// DELETE /api/clipboard/:pin — delete by PIN
router.delete('/:pin', deleteClipboard);

module.exports = router;
