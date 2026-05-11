'use strict';

// ── Application Insights — MUST be first import ───────────────────────────────
// The SDK monkey-patches http, pg, ioredis at require-time.
// Any require() before this line will NOT be auto-instrumented.
require('dotenv').config();
const { initAppInsights } = require('./src/instrumentation/appInsights');
initAppInsights();

const http = require('http');
const app = require('./src/app');
const { sequelize } = require('./src/config/db');
const redisClient = require('./src/config/redis');
const { initSocket } = require('./src/socket/clipboard.socket');

// ── Model associations — must be set up before any query runs ─────────────────
const User = require('./src/models/user.model');
const Clipboard = require('./src/models/clipboard.model');
User.hasMany(Clipboard, { foreignKey: 'user_id', as: 'clipboards', onDelete: 'SET NULL' });
Clipboard.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

const PORT = process.env.PORT || 4000;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

/**
 * Attempt to authenticate the Sequelize DB connection with exponential
 * backoff. This prevents the API container from crashing immediately when
 * postgres is still initialising.
 */
async function connectWithRetry(attempt = 1) {
  try {
    await sequelize.authenticate();
    console.log(`[DB] PostgreSQL connected successfully.`);

    // Sync all models (create tables if not exist). Safe for development;
    // use migrations in later weeks.
    // alter:true safely adds new columns (user_id) without dropping existing data.
    // Switch to proper migrations in Week 3.
    await sequelize.sync({ alter: true });
    console.log('[DB] Schema synchronised.');
  } catch (err) {
    if (attempt >= MAX_RETRIES) {
      console.error(`[DB] Failed to connect after ${MAX_RETRIES} attempts. Exiting.`);
      process.exit(1);
    }
    const delay = RETRY_DELAY_MS * attempt;
    console.warn(`[DB] Connection attempt ${attempt} failed. Retrying in ${delay / 1000}s...`, err.message);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return connectWithRetry(attempt + 1);
  }
}

async function startServer() {
  // 1. Ensure DB is ready
  await connectWithRetry();

  // 2. Redis client connects lazily — log connection events
  redisClient.on('connect', () => console.log('[Redis] Connected.'));
  redisClient.on('error', (err) => console.error('[Redis] Error:', err.message));

  // 3. Create HTTP server from Express app
  const server = http.createServer(app);

  // 4. Attach Socket.io
  initSocket(server);

  // 5. Start listening
  server.listen(PORT, () => {
    console.log(`[Server] ClipSync API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  // 6. Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      try {
        await sequelize.close();
        console.log('[DB] Connection closed.');
        await redisClient.quit();
        console.log('[Redis] Connection closed.');
      } catch (err) {
        console.error('[Server] Error during shutdown:', err.message);
      } finally {
        process.exit(0);
      }
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
