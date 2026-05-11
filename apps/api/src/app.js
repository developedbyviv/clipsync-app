'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('./config/passport');

const clipboardRouter = require('./routes/clipboard.routes');
const authRouter = require('./routes/auth.routes');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const { register, httpRequestDuration } = require('./instrumentation/metrics');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS — must be before other middleware for preflight support ──────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()),
].filter(Boolean);

// Deduplicate
const uniqueOrigins = [...new Set(allowedOrigins)];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || uniqueOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Required for httpOnly cookie auth
  })
);

// ── Request logging ───────────────────────────────────────────────────────────
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Cookie parser — required before JWT auth middleware ───────────────────────
app.use(cookieParser());

// ── Session — used only for Passport OAuth redirect flow (not app-level auth) ─
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'clipsync-session-fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 10 * 60 * 1000, // 10 minutes — only needed for OAuth flow
    },
  })
);

// ── Passport ──────────────────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ── Rate limiting (global) ────────────────────────────────────────────────────
app.use('/api/', rateLimiter);

// ── Prometheus metrics middleware ─────────────────────────────────────────────
// Records duration for every request into the http_request_duration_seconds histogram.
// Must be registered before routes so every request is captured.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const durationSeconds = (Date.now() - start) / 1000;
    httpRequestDuration.observe(
      {
        method: req.method,
        // Use matched route pattern (e.g. /api/clipboard/:pin) not raw URL
        route: req.route?.path || req.path,
        status_code: String(res.statusCode),
      },
      durationSeconds
    );
  });
  next();
});

// ── Prometheus /metrics endpoint ──────────────────────────────────────────────
// Internal only — NOT exposed via Ingress (no /metrics rule in ingress.yaml).
// Prometheus scrapes this via ServiceMonitor → ClusterIP → /metrics.
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/clipboard', clipboardRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
  });
});

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;
