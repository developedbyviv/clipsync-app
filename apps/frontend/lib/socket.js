import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socket = null;

/**
 * Returns the singleton Socket.io client instance.
 * Creates it on first call with reconnection settings.
 */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,        // Connect manually to control lifecycle
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    socket.on('reconnect', (attempt) => {
      console.log(`[Socket] Reconnected after ${attempt} attempts`);
    });
  }

  return socket;
}

/**
 * Disconnect and destroy the socket instance.
 * Call this when the component using the socket unmounts.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
