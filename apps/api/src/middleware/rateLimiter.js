'use strict';

const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 20,             // max 20 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Too many requests from this IP, please try again after a minute.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  handler(req, res, next, options) {
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = rateLimiter;
