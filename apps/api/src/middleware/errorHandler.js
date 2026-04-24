'use strict';

/**
 * Global Express error handler.
 * Must have exactly 4 parameters for Express to recognise it as an error handler.
 * Returns a consistent JSON error shape: { error: true, message, code }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected error occurred.';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  // Log full error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error Handler]', {
      statusCode,
      code,
      message,
      stack: err.stack,
    });
  } else {
    // In production, log a minimal error without the stack trace
    console.error('[Error Handler]', { statusCode, code, message });
  }

  return res.status(statusCode).json({
    error: true,
    message,
    code,
  });
}

module.exports = errorHandler;
