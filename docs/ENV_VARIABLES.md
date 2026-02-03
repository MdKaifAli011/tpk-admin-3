# Environment Variables Reference

Copy these into your `.env` file and fill in the values. Never commit real secrets to the repo.

---

## Required (app may not start in production without these)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/myapp` |
| `JWT_SECRET` | Secret for signing JWT tokens | (long random string) |
| `SESSION_SECRET` | Secret for session encryption | (long random string) |

---

## Server / App

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | `development` or `production` | `development` |
| `CORS_ORIGIN` | Allowed CORS origin | `*` |
| `LOG_LEVEL` | Logger level: `error`, `warn`, `info`, `debug` | prod: `info`, dev: `debug` |

---

## Database

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | (required) |
| `MONGO_DB_NAME` | Database name (if not in URI) | optional |
| `MAX_CONNECTIONS` | MongoDB pool max size | `10` |
| `CONNECTION_TIMEOUT` | Connection timeout (ms) | `30000` |

---

## JWT / Session

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_EXPIRES_IN` | Access token expiry | `24h` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `SESSION_SECRET` | Session secret | (required) |

---

## Public (client-visible; prefix `NEXT_PUBLIC_`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_BASE_PATH` | Base path for app/API | `/self-study` |
| `NEXT_PUBLIC_API_URL` | Full API base URL | `http://localhost:3000/self-study/api` |
| `NEXT_PUBLIC_APP_URL` | Public app URL (SEO, links) | `https://testprepkart.com` |
| `NEXT_PUBLIC_LEAD_ACCESS_PASSWORD` | Lead management page password (client fallback) | (optional) |

---

## Mail (SMTP)

| Variable | Description | Example |
|----------|-------------|---------|
| `MAIL_MAILER` | Mail driver | `smtp` |
| `MAIL_HOST` | SMTP host | `smtp.hostinger.com` |
| `MAIL_PORT` | SMTP port | `465` |
| `MAIL_USERNAME` | SMTP username | `donot-reply@testprepkart.in` |
| `MAIL_PASSWORD` | SMTP password | (your password) |
| `MAIL_ENCRYPTION` | `ssl` or `tls` | `ssl` |
| `MAIL_FROM_ADDRESS` | From email address | `donot-reply@testprepkart.in` |
| `MAIL_FROM_NAME` | From display name | `TestPrepKart` |

**Lead export email (recipient for CSV when admin exports leads):**

| Variable | Description | Default |
|----------|-------------|---------|
| `LEAD_EXPORT_MAIL_TO` | Email to receive lead export CSV | `hellomdkaifali@gmail.com` |

**Legacy email (fallback if MAIL_* not set):**

| Variable | Description |
|----------|-------------|
| `EMAIL_SERVICE` | Service name |
| `EMAIL_HOST` | SMTP host |
| `EMAIL_PORT` | SMTP port |
| `EMAIL_SECURE` | `true` for SSL |
| `EMAIL_USER` | Username |
| `EMAIL_PASS` | Password |

---

## Cron (VPS visit-stats job)

| Variable | Description |
|----------|-------------|
| `CRON_SECRET` | Secret for authenticating cron request; use the same value in crontab when calling `/self-study/api/cron/update-visit-stats`. |

---

## Admin

| Variable | Description |
|----------|-------------|
| `ADMIN_REGISTRATION_CODE` | Code required to register a new admin user (auth/register). |

---

## Build / Dev

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_SOURCE_MAPS` | Enable source maps in production | `false` (set `true` to enable) |

---

## Example: Test / Development

Copy into `.env` or `.env.local` for local/test. Replace placeholder values.

```env
NODE_ENV=development
PORT=3000

# Required
MONGODB_URI=mongodb://localhost:27017/tpk
JWT_SECRET=dev_jwt_secret_change_in_production
SESSION_SECRET=dev_session_secret_change_in_production

# Public (dev)
NEXT_PUBLIC_BASE_PATH=/self-study
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/self-study/api

# Admin + Cron (dev)
ADMIN_REGISTRATION_CODE=dev_admin_code
CRON_SECRET=dev_cron_secret_change_in_production

# Optional
CORS_ORIGIN=*
LOG_LEVEL=debug
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Mail (optional in dev)
# MAIL_MAILER=smtp
# MAIL_HOST=smtp.example.com
# MAIL_PORT=465
# MAIL_USERNAME=...
# MAIL_PASSWORD=...
# MAIL_ENCRYPTION=ssl
# MAIL_FROM_ADDRESS=...
# MAIL_FROM_NAME=TestPrepKart
# LEAD_EXPORT_MAIL_TO=you@example.com
```

---

## Example: Production (VPS)

Copy into `.env` on the VPS. Use strong random secrets; do not commit this file.

```env
NODE_ENV=production
PORT=3000

# Required
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/tpk?retryWrites=true&w=majority
JWT_SECRET=REPLACE_WITH_STRONG_RANDOM_SECRET_32_CHARS_OR_MORE
SESSION_SECRET=REPLACE_WITH_ANOTHER_STRONG_RANDOM_SECRET

# Public (production domain)
NEXT_PUBLIC_BASE_PATH=/self-study
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/self-study/api

# Admin + Cron (production)
ADMIN_REGISTRATION_CODE=REPLACE_WITH_SECURE_ADMIN_CODE
CRON_SECRET=REPLACE_WITH_STRONG_CRON_SECRET_FOR_VPS_CRONTAB

# Optional
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info
MONGO_DB_NAME=tpk
MAX_CONNECTIONS=20
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Mail (production SMTP)
MAIL_MAILER=smtp
MAIL_HOST=smtp.yourprovider.com
MAIL_PORT=465
MAIL_USERNAME=noreply@yourdomain.com
MAIL_PASSWORD=REPLACE_WITH_MAIL_PASSWORD
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME=TestPrepKart
LEAD_EXPORT_MAIL_TO=admin@yourdomain.com
```

On the VPS, use the same `CRON_SECRET` value in your crontab when calling the visit-stats endpoint (see `docs/VISIT_TRACKING_AND_CRON_VERIFICATION.md`).

---

*Generated for tpk-admin-3. Add or remove variables as your project evolves.*
