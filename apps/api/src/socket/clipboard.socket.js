'use strict';

const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { updateClipboard } = require('../services/clipboard.service');
const { websocketConnectionsActive } = require('../instrumentation/metrics');

/**
 * Initialise Socket.io on the provided HTTP server.
 * @param {import('http').Server} httpServer
 */
function initSocket(httpServer) {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()),
  ].filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: [...new Set(allowedOrigins)],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── Optional auth middleware — attaches userId to socket.data if JWT present ──
  // This is non-blocking: guests (no token) are welcome.
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || '';
      const cookies = Object.fromEntries(
        cookieHeader
          .split(';')
          .map((c) => {
            const [key, ...val] = c.trim().split('=');
            return [key.trim(), val.join('=')];
          })
          .filter(([k]) => k)
      );

      const token = cookies['clipsync_token'];
      if (token && process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.data.userId = decoded.userId;
      }
    } catch {
      // Invalid/missing token — socket proceeds as guest
    }
    next();
  });

  io.on('connection', (socket) => {
    // Increment active WebSocket connections gauge
    websocketConnectionsActive.inc();
    console.log(`[Socket] Client connected: ${socket.id} (userId: ${socket.data.userId || 'guest'})`);

    /**
     * Client joins a room identified by clipboard PIN.
     * Event: "join-clipboard"  Payload: { pin: string }
     */
    socket.on('join-clipboard', ({ pin } = {}) => {
      if (!pin || !/^\d{6}$/.test(pin)) {
        socket.emit('error', { message: 'Invalid PIN format.', code: 'INVALID_PIN' });
        return;
      }
      socket.join(pin);
      console.log(`[Socket] ${socket.id} joined room: ${pin}`);
    });

    /**
     * Client broadcasts an edit.
     * Event: "update-clipboard"  Payload: { pin: string, content: string }
     */
    socket.on('update-clipboard', async ({ pin, content } = {}) => {
      if (!pin || !/^\d{6}$/.test(pin)) {
        socket.emit('error', { message: 'Invalid PIN format.', code: 'INVALID_PIN' });
        return;
      }

      try {
        const result = await updateClipboard(pin, content ?? '');
        socket.to(pin).emit('clipboard-updated', result);
      } catch (err) {
        console.error(`[Socket] Failed to update clipboard ${pin}:`, err.message);
        socket.emit('error', {
          message: err.message || 'Failed to update clipboard.',
          code: err.code || 'UPDATE_FAILED',
        });
      }
    });

    socket.on('disconnect', (reason) => {
      // Decrement active WebSocket connections gauge
      websocketConnectionsActive.dec();
      console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket] Socket error on ${socket.id}:`, err.message);
    });
  });

  return io;
}

module.exports = { initSocket };
