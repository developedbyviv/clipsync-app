'use strict';

const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('[Config] REDIS_URL environment variable is required');
}

const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    if (times > 10) {
      console.error('[Redis] Max reconnection attempts reached.');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 200, 3000);
    console.warn(`[Redis] Reconnecting in ${delay}ms... (attempt ${times})`);
    return delay;
  },
  reconnectOnError(err) {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
    if (targetErrors.some((e) => err.message.includes(e))) {
      return true; // Reconnect on these specific errors
    }
    return false;
  },
});

redisClient.on('error', (err) => {
  console.error('[Redis] Client error:', err.message);
});

redisClient.on('ready', () => {
  console.log('[Redis] Client ready.');
});

module.exports = redisClient;
