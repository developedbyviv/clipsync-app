# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Builder — install all dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install all deps (including devDependencies)
COPY package*.json ./
RUN npm ci --include=dev

# Copy application source
COPY . .

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Production — minimal image with only prod deps
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory and give node user ownership BEFORE switching user.
# Without this, WORKDIR creates /app as root and npm ci fails with EACCES.
RUN mkdir -p /app && chown node:node /app

WORKDIR /app

# Switch to non-root user
USER node

# Copy package files (already owned by node via chown above)
COPY --chown=node:node package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy application source from builder stage
COPY --chown=node:node --from=builder /app/src ./src
COPY --chown=node:node --from=builder /app/server.js ./server.js

# Expose API port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

# Use dumb-init to handle PID 1 signals correctly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
