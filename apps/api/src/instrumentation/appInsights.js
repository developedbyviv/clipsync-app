// ─────────────────────────────────────────────────────────────────────────────
// apps/api/src/instrumentation/appInsights.js
// Azure Application Insights SDK initialisation.
//
// IMPORTANT: This module must be required() BEFORE any other require() calls
// in server.js. The SDK monkey-patches http, https, pg, ioredis, and other
// modules at require-time to enable auto-instrumentation. Loading it after
// Express or Sequelize means those modules won't be traced.
//
// Auto-collects:
//   • HTTP requests (all Express routes)
//   • Performance counters (CPU, memory)
//   • Unhandled exceptions and promise rejections
//   • External dependencies (PostgreSQL via pg, Redis via ioredis)
//   • console.log / console.error as traces
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

let appInsightsClient = null;

/**
 * Initialise Application Insights.
 * Safe to call multiple times — will only initialise once.
 * Silently skips if APPLICATIONINSIGHTS_CONNECTION_STRING is not set
 * (e.g. local development without Azure).
 */
function initAppInsights() {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    console.warn('[AppInsights] APPLICATIONINSIGHTS_CONNECTION_STRING not set — skipping telemetry.');
    return null;
  }

  if (appInsightsClient) {
    return appInsightsClient; // already initialised
  }

  try {
    const appInsights = require('applicationinsights');

    appInsights
      .setup(connectionString)
      // Auto-collect all HTTP requests through Express
      .setAutoCollectRequests(true)
      // CPU, memory, and event loop performance counters
      .setAutoCollectPerformance(true, true)
      // Unhandled exceptions and promise rejections
      .setAutoCollectExceptions(true)
      // pg (PostgreSQL), ioredis, http outbound calls
      .setAutoCollectDependencies(true)
      // console.log → Information trace, console.error → Error trace
      .setAutoCollectConsole(true, true)
      // Cache telemetry on disk if network is unavailable
      .setUseDiskRetryCaching(true)
      // Cloud role name — shows as "ClipSync API" in Application Map
      .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
      .start();

    appInsights.defaultClient.context.tags[
      appInsights.defaultClient.context.keys.cloudRole
    ] = `clipsync-api-${process.env.NODE_ENV || 'development'}`;

    appInsightsClient = appInsights.defaultClient;
    console.log('[AppInsights] Telemetry initialised.');
    return appInsightsClient;
  } catch (err) {
    console.error('[AppInsights] Failed to initialise:', err.message);
    return null;
  }
}

/**
 * Get the Application Insights client for manual event/metric tracking.
 * Returns null if App Insights was not initialised (e.g. local dev).
 */
function getClient() {
  return appInsightsClient;
}

module.exports = { initAppInsights, getClient };
