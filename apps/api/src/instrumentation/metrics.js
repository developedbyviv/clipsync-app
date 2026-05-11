// ─────────────────────────────────────────────────────────────────────────────
// apps/api/src/instrumentation/metrics.js
// Prometheus metrics for ClipSync API.
//
// Usage:
//   const { clipboardCreatedTotal, register } = require('./metrics');
//   clipboardCreatedTotal.inc({ expires_in: '24h', ... });
//
// Naming conventions (Prometheus best practices):
//   snake_case names | unit as suffix (_seconds, _total, _bytes)
//   _total suffix for Counters | no suffix for Gauges
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const client = require('prom-client');

// Collect default Node.js runtime metrics:
// event loop lag, GC duration, heap usage, active handles, CPU seconds.
// collectDefaultMetrics() must be called ONCE at startup.
client.collectDefaultMetrics({
  prefix: 'clipsync_nodejs_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// ── Counters ──────────────────────────────────────────────────────────────────

/** Total number of clipboards created, labelled by expiry, destroy flag, and auth state */
const clipboardCreatedTotal = new client.Counter({
  name: 'clipsync_clipboard_created_total',
  help: 'Total number of clipboards created',
  labelNames: ['expires_in', 'read_and_destroy', 'authenticated'],
});

/** Total clipboard retrieval attempts */
const clipboardRetrievedTotal = new client.Counter({
  name: 'clipsync_clipboard_retrieved_total',
  help: 'Total number of clipboard retrieval attempts',
  labelNames: ['found', 'expired'],
});

// ── Gauges ────────────────────────────────────────────────────────────────────

/** Current number of active Socket.io WebSocket connections */
const websocketConnectionsActive = new client.Gauge({
  name: 'clipsync_websocket_connections_active',
  help: 'Number of active WebSocket connections',
});

// ── Histograms ────────────────────────────────────────────────────────────────

/**
 * HTTP request duration in seconds.
 * Buckets cover fast API calls (10ms) through slow ones (5s).
 * Used for p50/p95/p99 latency panels in Grafana.
 */
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

module.exports = {
  register: client.register,
  clipboardCreatedTotal,
  clipboardRetrievedTotal,
  websocketConnectionsActive,
  httpRequestDuration,
};
