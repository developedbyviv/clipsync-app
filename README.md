# ClipSync 📋

> **Week 1 of a 5-week DevOps Portfolio Project** — Full-stack Online Clipboard with real-time sync, containerized with Docker Compose.

A production-grade clipboard sharing application that lets users paste text, get a 6-digit PIN, and share it instantly. Changes sync across all connected clients in real time via Socket.io.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Compose Network                    │
│                                                                 │
│   ┌──────────────────┐      ┌──────────────────────────────┐   │
│   │  Next.js 14      │      │     Express API + Socket.io  │   │
│   │  Frontend :3000  │─────▶│     apps/api       :4000     │   │
│   └──────────────────┘      └──────────┬─────────┬─────────┘   │
│                                        │         │              │
│                             ┌──────────▼──┐   ┌──▼──────────┐  │
│                             │ PostgreSQL  │   │   Redis 7   │  │
│                             │  16-alpine  │   │   Cache     │  │
│                             │    :5432    │   │    :6379    │  │
│                             └─────────────┘   └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow:**
1. User creates clipboard → API generates 6-digit PIN, stores in PostgreSQL + Redis
2. User shares PIN → recipient opens `/clipboard/<PIN>` → API serves from Redis cache
3. Live edits → Socket.io room per PIN → changes broadcast to all connected clients
4. Expiry → Redis TTL + PostgreSQL `expires_at` field; readAndDestroy deletes on first read

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, socket.io-client, axios |
| Backend API | Node.js 20, Express, Socket.io, express-rate-limit, helmet |
| ORM | Sequelize with pg/pg-hstore |
| Cache | Redis 7 via ioredis |
| Database | PostgreSQL 16 |
| Containerization | Docker, Docker Compose v3.9 |
| Runtime | Node 20 LTS (Alpine images) |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- Node.js 20 LTS (only for local dev without Docker)

---

## Quick Start

### 1. Clone & configure environment

```bash
git clone <repo-url>
cd onlineClipboard
cp .env.example .env
# Edit .env if you want to change passwords/ports
```

### 2. Local Development (hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000 |
| API Health | http://localhost:4000/api/health |

### 3. Production Run

```bash
docker compose up --build
```

---

## API Endpoints

| Method | Endpoint | Description | Request Body |
|---|---|---|---|
| `GET` | `/api/health` | Health check | — |
| `POST` | `/api/clipboard` | Create clipboard | `{ content, expiresIn, readAndDestroy }` |
| `GET` | `/api/clipboard/:pin` | Retrieve clipboard by PIN | — |
| `DELETE` | `/api/clipboard/:pin` | Delete clipboard | — |

### Request Body — POST `/api/clipboard`

```json
{
  "content": "Hello, world!",
  "expiresIn": "1h",
  "readAndDestroy": false
}
```

- `expiresIn`: `"1h"` | `"24h"` | `"7d"` (default: `"24h"`)
- `readAndDestroy`: boolean — if `true`, clipboard is deleted after first `GET`

### Success Response — POST `/api/clipboard`

```json
{
  "pin": "482910",
  "url": "http://localhost:3000/clipboard/482910",
  "expiresAt": "2024-01-21T12:00:00.000Z"
}
```

### Error Response Format

```json
{
  "error": true,
  "message": "Clipboard not found or has expired",
  "code": "CLIPBOARD_NOT_FOUND"
}
```

---

## Socket.io Events

| Direction | Event | Payload | Description |
|---|---|---|---|
| Client → Server | `join-clipboard` | `{ pin }` | Join the room for a PIN |
| Client → Server | `update-clipboard` | `{ pin, content }` | Broadcast edit to room |
| Server → Client | `clipboard-updated` | `{ content, updatedAt }` | Received edit from another client |

---

## Project Structure

```
onlineClipboard/
├── apps/
│   ├── api/                        # Node.js + Express + Socket.io
│   │   ├── src/
│   │   │   ├── config/             # DB (Sequelize) + Redis (ioredis) clients
│   │   │   ├── controllers/        # Request/response handlers
│   │   │   ├── middleware/         # Error handler, rate limiter
│   │   │   ├── models/             # Sequelize models
│   │   │   ├── routes/             # Express routers
│   │   │   ├── services/           # Business logic
│   │   │   ├── socket/             # Socket.io event handlers
│   │   │   └── app.js              # Express app setup
│   │   ├── server.js               # HTTP server entry point
│   │   └── Dockerfile              # Multi-stage production build
│   │
│   └── frontend/                   # Next.js 14 App Router
│       ├── app/
│       │   ├── layout.js           # Root layout (dark mode, SEO)
│       │   ├── page.js             # Home — create clipboard
│       │   └── clipboard/[pin]/    # Live clipboard viewer
│       ├── components/             # React components
│       ├── lib/                    # Axios + Socket.io singletons
│       └── Dockerfile              # Multi-stage standalone build
│
├── docker-compose.yml              # Production services
├── docker-compose.dev.yml          # Dev overrides (hot reload)
└── .env.example                    # All env vars documented
```

---

## Roadmap

- **Week 1** (current): Core app + Docker Compose ✅
- **Week 2**: CI/CD with GitHub Actions
- **Week 3**: Kubernetes deployment (Minikube)
- **Week 4**: Observability (Prometheus + Grafana)
- **Week 5**: Cloud deployment (AWS ECS or GKE)
