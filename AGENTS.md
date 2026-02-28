# AGENTS.md

## Cursor Cloud specific instructions

### Overview
TestPrepKart (tpk-admin-3) is a single Next.js 16 full-stack application for educational content management (NEET exam prep). It has two route groups: `(main)` for the public student site and `(admin)` for the admin panel. The app is served under base path `/self-study`.

### Required services
- **MongoDB** must be running before starting the dev server. In this cloud environment, start it with:
  ```
  sudo -u mongodb mongod --dbpath /var/lib/mongodb --logpath /var/log/mongodb/mongod.log --fork
  ```
- **Next.js dev server**: `npm run dev` (default port 3000, access at `localhost:<port>/self-study`)

### Environment variables
A `.env` file is required in the project root. See `docs/ENV_ALL_VARIABLES_WITH_EXAMPLES.md` for the full reference. The minimum required variables for development are: `MONGODB_URI`, `JWT_SECRET`, `SESSION_SECRET`. Note that `utils/.env.main` contains a reference production config — dotenv v17 may resolve env vars from multiple `.env` files, so values in `utils/.env.main` can override your `.env`.

### Gotchas
- The `ADMIN_REGISTRATION_CODE` used for registering admin users is set in the environment (check `utils/.env.main` for the value `TestPrepKart_2025`). The admin registration API is `POST /self-study/api/auth/register`.
- ESLint is configured via `eslint.config.mjs` (flat config, ESLint 9+). Run with `npx eslint .` — it takes ~2 minutes on the full codebase. Pre-existing warnings (React hook deps, `<img>` usage, unescaped entities) are expected.
- No automated test suite exists in this project (no test runner or test files). Linting is the only automated check.
- The `next.config.mjs` sets `basePath: "/self-study"` and `assetPrefix: "/self-study/"`. All URLs must include `/self-study` prefix.
- No Docker, no Redis, no external services beyond MongoDB.
- This environment does not have systemd; MongoDB must be started manually with `mongod --fork`.
