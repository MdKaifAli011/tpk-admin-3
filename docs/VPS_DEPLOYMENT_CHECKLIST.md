# VPS Deployment Checklist – tpk-admin-3

**Purpose:** After a deep read of the project (including lib cache layers, config, APIs), this checklist helps you host on a VPS without issues.

---

## 1. Project overview (relevant for VPS)

### 1.1 Cache layers

| Layer | Location | Scope | VPS note |
|-------|----------|--------|-----------|
| **Server in-memory** | `utils/cacheManager.js` | Single Node process, TTL 5 min, max 50 entries, periodic cleanup | **PM2 cluster:** Each worker has its own cache. Cache is not shared across instances. Acceptable; at worst more DB hits. |
| **Client list caches** | `lib/examListCache.js`, `subjectListCache.js`, `unitListCache.js`, `chapterListCache.js`, `topicListCache.js`, `subTopicListCache.js`, `definitionListCache.js` | Browser only; keyed by `metaFilter`; no server impact | No VPS impact. |

- `cacheManager` is used in many API routes (exam, subject, unit, chapter, topic, practice, blog, etc.) for GET caching and invalidation on mutations. It has cleanup and size limits, so no unbounded growth.

### 1.2 Config and env

- **`config/config.js`**
  - Uses `MONGODB_URI`, `JWT_SECRET`, `SESSION_SECRET` (required; app exits in production if missing).
  - `baseUrl` = `NEXT_PUBLIC_API_URL` or `http://localhost:3000/self-study/api`.
  - `siteUrl` = `NEXT_PUBLIC_SITE_URL` or `NEXT_PUBLIC_APP_URL`.
- **Base path:** App and API are under **`/self-study`** (`next.config.mjs`: `basePath: "/self-study"`). All client API calls use relative `/self-study/api` (via `lib/api.js` baseURL), so no hardcoded host in the app.

### 1.3 File system usage

- `process.cwd()` + `path.join` used for:
  - `public/assets` (videos, images)
  - `public/images/banner`
  - `app/api/uploads/[...slug]` (reading files)
- Uses Node `path` and `fs`; works on Linux VPS. No Windows-only paths.

### 1.4 Logger

- `utils/logger.js` logs in both development and production (LOG_LEVEL / NODE_ENV). No “dev-only” logging issue.

---

## 2. Must-do on VPS (avoid common issues)

### 2.1 Environment variables

Set these on the VPS (e.g. in `.env` or PM2 ecosystem):

```bash
NODE_ENV=production
PORT=3000

# Required (app exits if missing in production)
MONGODB_URI=mongodb+srv://...   # or mongodb://localhost:27017/...
JWT_SECRET=<min 32 chars>
SESSION_SECRET=<min 32 chars>

# Public URLs – use your real domain (no localhost)
NEXT_PUBLIC_BASE_PATH=/self-study
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/self-study/api
NEXT_PUBLIC_SITE_URL=https://yourdomain.com   # optional; used for “View” links from admin

# Cron (for visit-stats cron job)
CRON_SECRET=<strong secret>

# Optional but recommended
MONGO_DB_NAME=tpk
MAX_CONNECTIONS=20
CONNECTION_TIMEOUT=30000
LOG_LEVEL=info
```

- **Do not** rely on localhost for `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_API_URL` on VPS; otherwise API and links will point to the wrong place.

### 2.2 URL Export API (`/api/admin/url-export`)

- Builds public URLs using `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_ORIGIN` or a fallback.
- On VPS, set **`NEXT_PUBLIC_APP_URL`** (e.g. `https://yourdomain.com`) so exported URLs use your production domain.

### 2.3 Nginx (reverse proxy) and base path

- App is served under **`/self-study`**, not at root.
- Proxy **entire** `/self-study` to Next (including `/self-study/api`).

Example (minimal):

```nginx
location /self-study {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

- **Wrong:** Using `location /api { ... }` only and serving the app at `/` will break, because the app and API live under `/self-study`.

### 2.4 Cron (visit-stats)

- Endpoint: **`GET /self-study/api/cron/update-visit-stats`** (with `basePath`).
- Auth: `CRON_SECRET` via query `?secret=...` or header `Authorization: Bearer <CRON_SECRET>`.
- Crontab on VPS should call the full URL including base path, e.g.  
  `https://yourdomain.com/self-study/api/cron/update-visit-stats?secret=YOUR_CRON_SECRET`
- Optional: run only in 3:00–3:59 AM server time, or use `&test=1` to run anytime.

---

## 3. Optional but recommended

### 3.1 Health check

- A health endpoint is available at **`/api/health`** (`app/api/health/route.js`). Use it for:
  - Load balancer / Nginx health checks
  - Uptime monitoring
- Full URL on server: `https://yourdomain.com/self-study/api/health` (base path included).
- Returns `{ status: "healthy"|"degraded"|"unhealthy", database, uptime, memory }`; no auth required.

### 3.2 PM2 and in-memory cache

- If you run **multiple instances** (e.g. `instances: 2` or `max`), each has its own `cacheManager` in-memory cache. No shared cache between workers. Result: some requests may miss cache and hit DB; behaviour is correct, just slightly less cache benefit.

### 3.3 MongoDB

- `lib/mongodb.js` uses connection pooling (`maxPoolSize` from `MAX_CONNECTIONS`), retries, and timeouts. For production, set `MAX_CONNECTIONS=20` (or as needed).

### 3.4 Write paths (uploads)

- Upload routes write under `process.cwd()/public/...`. On VPS, ensure the process has **write permissions** to `public/assets` and `public/images/banner` (or create them with the correct owner).

---

## 4. Summary: will it work on VPS?

| Area | Status |
|------|--------|
| Env (MONGODB_URI, JWT, SESSION) | OK if set; app exits in prod if missing |
| Base path /self-study | OK; client uses relative API path |
| Server cache (cacheManager) | OK; bounded; multi-instance = per-worker cache |
| Client list caches (lib/*ListCache.js) | OK; client-side only |
| Logger | OK; works in production |
| File paths (path.join, process.cwd) | OK on Linux |
| Nginx | Must proxy `/self-study` (and thus `/self-study/api`) |
| Cron | Use full URL with base path + CRON_SECRET |
| URL export | Set NEXT_PUBLIC_APP_URL on VPS |

**Main pitfalls:**  
1) Not setting `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_API_URL` (and optionally `NEXT_PUBLIC_SITE_URL`) for the production domain.  
2) Nginx configured for `/` or `/api` only instead of `/self-study`.  
3) Cron URL without `/self-study` or without `CRON_SECRET`.

---

*Generated from a full project read including lib cache layers, config, and API usage.*
