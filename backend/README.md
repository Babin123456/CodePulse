<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# CodePulse (DevBattle) - NestJS Backend

Enterprise backend services powering the CodePulse / DevBattle developer analytics and gamification platform.

---

## 🚀 Features

- **GitHub API Proxying & Smart Caching**: High-performance cached endpoints for GitHub developer profiles, repositories, activity, and events.
- **Adaptive Rate Limiting**: Intelligent throttling via `@nestjs/throttler` keyed by authenticated user ID or client IP address.
- **Cache Management**: Tiered in-memory and Redis-backed caching with `@nestjs/cache-manager`.
- **Gamification Engine**: XP, levels, badges, battles, and developer rating calculations.
- **Background Sync Workers**: BullMQ-powered queues for asynchronous profile synchronization.

---

## 🛡️ Rate Limiting Architecture (`@nestjs/throttler`)

API abuse protection is enforced globally and on sensitive external proxy endpoints to prevent hitting GitHub's strict rate limits:

- **Tracker Strategy (`CustomThrottlerGuard`)**:
  - **Authenticated Users**: Throttled by User ID (`user-{id}`) extracted from JWT.
  - **Unauthenticated / Public**: Throttled by Client IP address (`ip-{ip}`), with automatic resolution of reverse proxy `X-Forwarded-For` headers.
- **Configured Thresholds**:
  - **Global Default**: 60 requests / minute per tracker.
  - **GitHub Proxy Endpoints (`/api/v1/github/developer`, `/profile`, `/repos`, `/events`)**: 30 requests / minute.
  - **Strict Endpoints (`POST /api/v1/github/sync`, `DELETE /api/v1/github/cache/:username`)**: 10 requests / minute.
- **Rate Limit Response**: When a client exceeds quota, the server responds with `HTTP 429 Too Many Requests` and standard rate limit headers (`Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`).

---

## ⚡ Caching Strategy (`@nestjs/cache-manager`)

To minimize latency and safeguard external GitHub API quotas, non-volatile public data is cached with clearly defined Time-To-Live (TTL) durations:

| Endpoint | Cache Key | TTL | Description |
|---|---|---|---|
| `GET /api/v1/github/developer/:username` | `github:developer:{username}` | **5 minutes** (300s) | Aggregated developer metrics (score, habit, persona, stats) |
| `GET /api/v1/github/profile/:username` | `github:profile:{username}` | **10 minutes** (600s) | Public GitHub profile metadata |
| `GET /api/v1/github/repos/:username` | `github:repos:{username}:{limit}` | **5 minutes** (300s) | Repositories metadata and statistics |
| `GET /api/v1/github/events/:username` | `github:events:{username}:{limit}` | **3 minutes** (180s) | Recent public activity events |

### Cache Invalidation & Bypassing
1. **On-Demand Query Invalidation**:
   Clients can pass `?force=true` or `?refresh=true` to any proxy GET endpoint to evict existing cache and trigger a fresh GitHub API fetch:
   ```bash
   GET /api/v1/github/developer/torvalds?force=true
   ```
2. **Explicit User Cache Invalidation**:
   Calling `DELETE /api/v1/github/cache/:username` immediately clears all cached entries (`developer`, `profile`, `repos`, `events`) for the user:
   ```bash
   DELETE /api/v1/github/cache/torvalds
   ```
3. **Automatic TTL Expiration**:
   Cache keys automatically expire after their specified TTL, ensuring data remains fresh without manual intervention.

### Stale-while-revalidate and circuit breaker
Every successful GitHub response is also written under `github:stale:{cache key}` with a **1 hour** TTL, in Redis through `ioredis` (falling back to a per-process map if Redis is unreachable). Note that `CacheModule.register` in `app.module.ts` does not configure a Redis store, so the fresh keys above live in the in-process memory cache; only the stale copies are in Redis.

- Fresh key expired but a stale copy exists: the stale copy is returned immediately and refreshed once in the background.
- GitHub failing or the circuit breaker open: the stale copy is returned; with no stale copy, placeholder data from `constants/fallback.constants.ts` is returned (`fallbackSource: 'mock'`). A GitHub rate-limit response with nothing cached is still returned as `429`.
- The breaker opens after 3 consecutive failures (timeouts, 5xx, 429, rate-limit 403), stays open for 30 seconds, then lets one trial request through (HALF_OPEN). A 404 for an unknown user never counts as a failure.
- Responses served from the stale layer carry `stale: true` in the body and the header `x-cache: STALE-FALLBACK` (`HIT` for fresh cache hits, `MISS` for live fetches).

---

## 📦 Project Setup

```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate
```

## 🛠️ Compile and Run

```bash
# Development (watch mode)
npm run start:dev

# Production build
npm run build

# Start production server
npm run start:prod
```

## 🧪 Testing

```bash
# Run unit and integration tests
npm test

# Run tests with coverage
npm run test:cov
```

## 📚 API Documentation (Swagger)

When the server is running, the interactive OpenAPI/Swagger documentation is available at:
```
http://localhost:3001/api/docs
```
