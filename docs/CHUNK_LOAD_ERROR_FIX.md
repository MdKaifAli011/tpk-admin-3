# Fix: "Failed to load chunk" (e.g. app_layout_3873bb71.js)

If you see an error like:

```
Failed to load chunk /self-study/_next/static/chunks/app_layout_3873bb71.js
from module ... react-server-dom-turbopack ...
```

this usually means the browser or dev server is using **stale chunk references** (e.g. after a restart or rebuild), or there is a known issue with **Turbopack + basePath** in development.

## Quick fixes (try in order)

### 1. Hard refresh and clear cache

- **Windows/Linux:** `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac:** `Cmd + Shift + R`

Or clear site data for `localhost` (or your dev URL) in DevTools → Application → Storage → Clear site data.

### 2. Clean build and restart

From the project root:

```bash
npm run clean
npm run dev
```

This removes the `.next` folder so the next `dev` run generates fresh chunks.

### 3. Use Webpack instead of Turbopack (dev only)

Next.js 16 uses Turbopack by default. If the error keeps happening in dev, use Webpack:

```bash
npm run dev:webpack
```

Use this only for local development; production build is unaffected.

### 4. Production

For **production**, do a clean build and ensure the server serves the latest build:

```bash
npm run clean
npm run build
npm run start
```

If you use a CDN or reverse proxy, make sure it does not cache `/_next/static/*` (or `/self-study/_next/static/*` when using basePath) for too long, or that cache is invalidated on deploy.

## Why it happens

- **Development:** Restarting the dev server changes chunk hashes. The open tab may still request old chunk URLs that no longer exist.
- **basePath (`/self-study`):** With a base path, all assets are under `/self-study/_next/...`. Some tooling (e.g. Turbopack in certain versions) can have edge cases with basePath in dev.
- **Cache:** Browser or proxy cache can serve an old HTML that points to old chunk filenames.

## Scripts added to `package.json`

| Script           | Command              | Purpose                                      |
|-----------------|----------------------|----------------------------------------------|
| `npm run clean` | Remove `.next`       | Force a clean build on next `dev`/`build`   |
| `npm run dev:webpack` | `next dev --webpack` | Run dev with Webpack instead of Turbopack   |
