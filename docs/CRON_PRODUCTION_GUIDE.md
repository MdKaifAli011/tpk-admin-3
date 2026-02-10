# Cron Scheduler – Production Guide

## What the cron does

Your app has **one cron job**: **update visit stats**.

- **Endpoint:** `GET /api/cron/update-visit-stats`  
  (Full URL with base path: `{BASE_URL}/self-study/api/cron/update-visit-stats`)
- **Purpose:** Once per day it aggregates visit data from `visit_stats` and `visits` collections and writes `visitStats` (totalVisits, todayVisits, uniqueVisits, lastUpdated) onto exam, subject, unit, chapter, topic, subtopic, and definition documents. Only entities that have visit data are updated (batched, with delay between batches to avoid DB overload).
- **Time window:** The route **only runs** when the server’s hour is **3** (3:00–3:59 AM). Outside that window it returns 400 unless you use a test flag.

---

## Auth: CRON_SECRET

The endpoint is protected by a shared secret.

1. **Set in env (same as your Next.js app):**
   ```env
   CRON_SECRET=your_strong_random_secret_here
   ```
   Generate a safe value: `openssl rand -hex 24`

2. **Send the secret in the request (one of):**
   - **Header (recommended):** `Authorization: Bearer <CRON_SECRET>`
   - **Query:** `?secret=<CRON_SECRET>`  
     (Avoid in production if your server logs full URLs.)

If the secret is missing or wrong, the API returns **401 Unauthorized**.

---

## How to use in production

### Option A: VPS / Linux (crontab + script) – recommended

1. **Ensure `CRON_SECRET` is set** in the same `.env` (or environment) your app uses on the server.

2. **Use the project script** (sends secret in header, no secret in URL):
   ```bash
   cd /path/to/tpk-admin-3
   chmod +x scripts/run-update-visit-stats.sh
   ```
   - **Optional:** If the cron will call the app via the public URL, set:
     ```env
     CRON_BASE_URL=https://yourdomain.com
     ```
     (Script default is `http://localhost:3000`.)

3. **Add a crontab entry** (daily at 3:00 AM server time):
   ```bash
   crontab -e
   ```
   Add:
   ```cron
   # Visit stats: daily at 3:00 AM (server timezone)
   0 3 * * * cd /path/to/tpk-admin-3 && ./scripts/run-update-visit-stats.sh >> /var/log/visit-stats-cron.log 2>&1
   ```
   Replace `/path/to/tpk-admin-3` with your real project root.

4. **Use a specific timezone** (e.g. Asia/Kolkata):
   ```cron
   0 3 * * * TZ=Asia/Kolkata cd /path/to/tpk-admin-3 && ./scripts/run-update-visit-stats.sh >> /var/log/visit-stats-cron.log 2>&1
   ```

5. **If the app runs in Docker / another host:** set `CRON_BASE_URL` to the URL the cron can reach (e.g. `http://next-app:3000` or `https://yourdomain.com`) so the script calls the correct host.

---

### Option B: One-liner without the script

If you don’t want to use the script, you can call the API with `curl` and read the secret from `.env`:

```cron
0 3 * * * curl -s -H "Authorization: Bearer $(grep CRON_SECRET /path/to/tpk-admin-3/.env | cut -d= -f2-)" "http://localhost:3000/self-study/api/cron/update-visit-stats" >> /var/log/visit-stats-cron.log 2>&1
```

Replace `/path/to/tpk-admin-3` and the URL if your app is on a different host/port (or use `https://yourdomain.com/self-study/...`).

---

### Option C: Hosted cron services (e.g. cron-job.org, EasyCron)

1. Create a scheduled HTTP request:
   - **URL:** `https://yourdomain.com/self-study/api/cron/update-visit-stats`  
     (Use your real domain and base path.)
2. **Schedule:** Daily at 3:00 AM in your chosen timezone.
3. **Auth:** Add header `Authorization: Bearer YOUR_CRON_SECRET` (same value as in your app’s `CRON_SECRET` env).  
   Do not put the secret in the URL if the service logs it.

---

## Test run (any time)

The route only runs the job between 3:00–3:59 AM **unless** you add **`?test=1`** (or `?dryRun=1`). Then it runs regardless of time.

**Using the script:**
```bash
./scripts/run-update-visit-stats.sh test
```

**Using curl:**
```bash
# With secret in header (recommended)
curl -s -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/self-study/api/cron/update-visit-stats?test=1"

# Or with secret in query (quick test only)
curl -s "http://localhost:3000/self-study/api/cron/update-visit-stats?secret=YOUR_CRON_SECRET&test=1"
```

Expected: JSON with `"ok": true` and a summary of updated counts per level.

---

## Summary

| Item | Detail |
|------|--------|
| **What runs** | Visit-stats aggregation and write to exam/subject/unit/chapter/topic/subtopic/definition. |
| **When (production)** | Once per day at 3:00 AM server time (or at the time you set in crontab / external cron). |
| **Auth** | `CRON_SECRET` in env; send via `Authorization: Bearer <secret>` or `?secret=<secret>`. |
| **Test anytime** | Add `?test=1` (and the secret); no need to wait for 3 AM. |
| **Script** | `scripts/run-update-visit-stats.sh` (production) and `scripts/run-update-visit-stats.sh test` (test). |
| **Base path** | If your app uses a base path (e.g. `/self-study`), the full path is `{BASE_URL}/self-study/api/cron/update-visit-stats`. |

For more detail (visit tracking flow, troubleshooting), see **`docs/VISIT_TRACKING_AND_CRON_VERIFICATION.md`**.
