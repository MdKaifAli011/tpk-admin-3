# All Environment Variables – With Examples

Use this as a single reference. Copy into `.env` or `.env.local` and replace placeholder values. **Never commit real secrets.**

---

## Complete example (all variables)

```env
# =============================================
# SERVER
# =============================================
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info

# =============================================
# REQUIRED (app exits in production if missing)
# =============================================
MONGODB_URI=mongodb://admin:yourpassword@127.0.0.1:27017/tpk-admin-db?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
SESSION_SECRET=your-super-secret-session-key-minimum-32-characters-long

# =============================================
# DATABASE
# =============================================
MONGO_DB_NAME=tpk-admin-db
MAX_CONNECTIONS=20
CONNECTION_TIMEOUT=30000

# =============================================
# JWT / SESSION
# =============================================
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# =============================================
# PUBLIC (NEXT_PUBLIC_* = visible in browser)
# =============================================
NEXT_PUBLIC_BASE_PATH=/self-study
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/self-study/api
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_LEAD_ACCESS_PASSWORD=tpk-admin-lead-pass

# =============================================
# MAIL (SMTP)
# =============================================
MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USERNAME=donot-reply@testprepkart.in
MAIL_PASSWORD=your-smtp-password
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS=donot-reply@testprepkart.in
MAIL_FROM_NAME=TestPrepKart
LEAD_EXPORT_MAIL_TO=admin@example.com

# Legacy email (fallback if MAIL_* not set)
# EMAIL_SERVICE=smtp
# EMAIL_HOST=smtp.hostinger.com
# EMAIL_PORT=465
# EMAIL_SECURE=true
# EMAIL_USER=donot-reply@testprepkart.in
# EMAIL_PASS=your-smtp-password

# =============================================
# CRON (visit-stats job on VPS)
# =============================================
CRON_SECRET=your-strong-cron-secret-min-32-chars

# =============================================
# ADMIN
# =============================================
ADMIN_REGISTRATION_CODE=YourSecureAdminCode_2025

# =============================================
# BUILD / PLATFORM (optional)
# =============================================
ENABLE_SOURCE_MAPS=false
# VERCEL_URL is set automatically on Vercel
# NEXT_PUBLIC_ORIGIN used in url-export as fallback for public URL
```

---

## Variable list with example and description

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| **Server** | | | |
| `PORT` | `3000` | No | Server port (default 3000). |
| `NODE_ENV` | `production` or `development` | No | Environment (default development). |
| `CORS_ORIGIN` | `https://yourdomain.com` | No | Allowed CORS origin (default `*`). Use your domain in production. |
| `LOG_LEVEL` | `error`, `warn`, `info`, `debug` | No | Logger level (prod default info, dev default debug). |
| **Required** | | | |
| `MONGODB_URI` | `mongodb://user:pass@host:27017/dbname?authSource=admin` | **Yes** (prod) | MongoDB connection string. |
| `JWT_SECRET` | `long-random-string-32-chars-minimum` | **Yes** (prod) | Secret for signing JWT tokens. |
| `SESSION_SECRET` | `another-long-random-string-32-chars` | **Yes** (prod) | Secret for session encryption. |
| **Database** | | | |
| `MONGO_DB_NAME` | `tpk-admin-db` | No | Database name (if not in URI). |
| `MAX_CONNECTIONS` | `20` | No | MongoDB pool max size (default 10). |
| `CONNECTION_TIMEOUT` | `30000` | No | Connection timeout in ms (default 30000). |
| **JWT / Session** | | | |
| `JWT_EXPIRES_IN` | `24h` | No | Access token expiry (default 24h). |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | No | Refresh token expiry (default 7d). |
| **Public (client-visible)** | | | |
| `NEXT_PUBLIC_BASE_PATH` | `/self-study` | No | Base path for app and API (default /self-study). **No space before =** |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` | No | Public app URL (SEO, links, URL export). |
| `NEXT_PUBLIC_API_URL` | `https://yourdomain.com/self-study/api` | No | Full API base URL. |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` | No | Same as APP_URL; used for “View” links from admin. |
| `NEXT_PUBLIC_LEAD_ACCESS_PASSWORD` | `tpk-admin-lead-pass` | No | Lead management page password (client fallback). |
| **Mail** | | | |
| `MAIL_MAILER` | `smtp` | No | Mail driver. |
| `MAIL_HOST` | `smtp.hostinger.com` | No | SMTP host. |
| `MAIL_PORT` | `465` | No | SMTP port. |
| `MAIL_USERNAME` | `donot-reply@testprepkart.in` | No | SMTP username. |
| `MAIL_PASSWORD` | `your-password` | No | SMTP password. |
| `MAIL_ENCRYPTION` | `ssl` or `tls` | No | Encryption. |
| `MAIL_FROM_ADDRESS` | `donot-reply@testprepkart.in` | No | From email. |
| `MAIL_FROM_NAME` | `TestPrepKart` | No | From display name. |
| `LEAD_EXPORT_MAIL_TO` | `admin@example.com` | No | Email to receive lead export CSV. |
| **Legacy email** (fallback) | | | |
| `EMAIL_SERVICE` | `smtp` | No | Same as MAIL_MAILER. |
| `EMAIL_HOST` | `smtp.hostinger.com` | No | Same as MAIL_HOST. |
| `EMAIL_PORT` | `465` | No | Same as MAIL_PORT. |
| `EMAIL_SECURE` | `true` | No | SSL. |
| `EMAIL_USER` | `donot-reply@testprepkart.in` | No | Same as MAIL_USERNAME. |
| `EMAIL_PASS` | `your-password` | No | Same as MAIL_PASSWORD. |
| **Cron** | | | |
| `CRON_SECRET` | `strong-random-secret-32-chars` | No | Secret for cron endpoint (visit-stats). |
| **Admin** | | | |
| `ADMIN_REGISTRATION_CODE` | `YourSecureCode_2025` | No | Code required to register new admin user. |
| **Build / platform** | | | |
| `ENABLE_SOURCE_MAPS` | `false` | No | Enable source maps in production. |
| `VERCEL_URL` | (set by Vercel) | No | Used in main app api.js if set. |
| `NEXT_PUBLIC_ORIGIN` | `https://yourdomain.com` | No | Fallback in url-export for public base URL. |

---

## Local / development example

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

MONGODB_URI=mongodb://localhost:27017/tpk
JWT_SECRET=dev_jwt_secret_change_in_production_32chars
SESSION_SECRET=dev_session_secret_change_in_production_32

NEXT_PUBLIC_BASE_PATH=/self-study
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/self-study/api

ADMIN_REGISTRATION_CODE=dev_admin_code
CRON_SECRET=dev_cron_secret_change_in_production
NEXT_PUBLIC_LEAD_ACCESS_PASSWORD=tpk-lead-dev

LOG_LEVEL=debug
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

---

## Production (VPS) example

```env
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info

MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/tpk?retryWrites=true&w=majority
MONGO_DB_NAME=tpk
MAX_CONNECTIONS=20
CONNECTION_TIMEOUT=30000

JWT_SECRET=REPLACE_WITH_openssl_rand_base64_32
SESSION_SECRET=REPLACE_WITH_ANOTHER_openssl_rand_base64_32
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

NEXT_PUBLIC_BASE_PATH=/self-study
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/self-study/api
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_LEAD_ACCESS_PASSWORD=your-lead-page-password

CRON_SECRET=REPLACE_WITH_STRONG_CRON_SECRET
ADMIN_REGISTRATION_CODE=YourSecureAdminRegistrationCode

MAIL_MAILER=smtp
MAIL_HOST=smtp.yourprovider.com
MAIL_PORT=465
MAIL_USERNAME=noreply@yourdomain.com
MAIL_PASSWORD=your-mail-password
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME=TestPrepKart
LEAD_EXPORT_MAIL_TO=admin@yourdomain.com
```

Generate strong secrets:

```bash
openssl rand -base64 32
```

---

*All variables used in tpk-admin-3 (config, lib, app/api, cron, url-export, auth, mail).*
