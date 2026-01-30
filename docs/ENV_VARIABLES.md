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

## Build / Dev

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_SOURCE_MAPS` | Enable source maps in production | `false` (set `true` to enable) |

---

## Example `.env` (minimal + mail + lead)

```env
# Required
MONGODB_URI=mongodb://localhost:27017/tpk
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# Optional server
PORT=3000
NODE_ENV=development

# Public (optional)
NEXT_PUBLIC_BASE_PATH=/self-study
NEXT_PUBLIC_APP_URL=https://testprepkart.com

# Mail
MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USERNAME=donot-reply@testprepkart.in
MAIL_PASSWORD=your_mail_password
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS=donot-reply@testprepkart.in
MAIL_FROM_NAME=TestPrepKart

# Lead export notification
LEAD_EXPORT_MAIL_TO=hellomdkaifali@gmail.com
```

---

*Generated for tpk-admin-3. Add or remove variables as your project evolves.*
