# Visit Tracking & Cron Schedule – Verification

## 0. CRON_SECRET – what it is and how to use it

**What it is:** A secret string that only your app and your cron job know. The visit-stats API route will run only if the request sends this exact value.

**Where to set it:**
- In your `.env` (or `.env.production` on the VPS):  
  `CRON_SECRET=your_strong_random_secret_here`
- Use a long random string (e.g. 32+ chars). Generate one with:  
  `openssl rand -hex 24`

**How the route accepts it (either one):**
1. **Header (recommended):** `Authorization: Bearer <CRON_SECRET>`  
   The cron job sends the secret in the header. Safer than query string (no secret in URLs/logs).
2. **Query param:** `?secret=<CRON_SECRET>`  
   Works for quick tests or if your cron can’t set headers. Avoid in production if your server logs full URLs.

**Flow:** When the cron job runs, it sends a GET request to the visit-stats URL and includes the secret (header or query). The route reads `process.env.CRON_SECRET` and compares it to what was sent. If they match → run the job; if not → 401 Unauthorized.

---

## 1. Visit tracking – all levels

Visit tracking is implemented and wired on **every content level** that has a page.

| Level      | Page path (under `[exam]`) | VisitTracker props | API `level` |
|-----------|-----------------------------|--------------------|-------------|
| **exam**  | `/` (exam landing)          | `level="exam"` `itemId={exam._id}` `itemSlug={examSlug}` | `exam` |
| **subject** | `/[subject]`             | `level="subject"` `itemId={subject._id}` `itemSlug={subjectSlugValue}` | `subject` |
| **unit**  | `/[subject]/[unit]`         | `level="unit"` `itemId={unit._id}` `itemSlug={unitSlugValue}` | `unit` |
| **chapter** | `/[subject]/[unit]/[chapter]` | `level="chapter"` `itemId={chapter._id}` `itemSlug={chapterSlugValue}` | `chapter` |
| **topic** | `.../[topic]`              | `level="topic"` `itemId={topic._id}` `itemSlug={topicSlugValue}` | `topic` |
| **subtopic** | `.../[subtopic]`         | `level="subtopic"` `itemId={subTopic._id}` `itemSlug={subTopicSlugValue}` | `subtopic` |
| **definition** | `.../[definition]`      | `level="definition"` `itemId={definition._id}` `itemSlug={definitionSlugValue}` | `definition` |

- **Hook:** `app/(main)/hooks/useVisitTracking.js` – `useVisitTracking(level, itemId, itemSlug)`.
- **Component:** `app/(main)/components/VisitTracker.jsx` – renders nothing; calls the hook and triggers one track per page.
- **API:** `app/api/analytics/track-visit/route.js` – `ALLOWED_LEVELS = ['exam','subject','unit','chapter','topic','subtopic','definition']` (all 7 levels).
- **IP check:** `app/api/analytics/check-ip/route.js` – one check per session (cached 5 min), then POST to track-visit.
- **Flow:** Check IP → if not blocked, POST track-visit with `level`, `itemId`, `itemSlug`; same IP + same page = at most one count per hour (stored in `visits` + `visit_stats`).

**Paths where tracking is disabled (by design):** prime-video, blog, download (`isNoTrackPath()` in `useVisitTracking.js`).

---

## 2. Visit-stats cron schedule (VPS)

### Endpoint and auth

- **URL (with basePath):** `GET /self-study/api/cron/update-visit-stats`
- **Auth:** Send `CRON_SECRET` either as `Authorization: Bearer <CRON_SECRET>` or as `?secret=<CRON_SECRET>`. Must match `CRON_SECRET` in your app’s `.env`.
- **Time window:** The route runs the update only when **server hour is 3** (3:00–3:59 AM server time). To run anytime (e.g. testing), add `?test=1` or `?dryRun=1` and the secret.

### What the cron does

- **Levels:** exam, subject, unit, chapter, topic, subtopic, definition (see `LEVEL_COLLECTIONS` in the route).
- **Logic:** Reads `visit_stats` and `visits`, aggregates counts per entity, and writes `visitStats` (totalVisits, todayVisits, uniqueVisits, lastUpdated) onto the 7 model collections. Only entities that have visit data are updated.

### Perfect VPS cron setup

**1. Set the secret in env (same as app):**

In the same environment your Next app uses (e.g. `.env` on the VPS):

```env
CRON_SECRET=your_strong_random_secret_here
```

**2. Use the project’s cron script (recommended)**

The repo includes `scripts/run-update-visit-stats.sh`. It loads `CRON_SECRET` from the project’s `.env` and calls the visit-stats endpoint (secret in header, not in URL).

On the VPS, from the project root:

```bash
chmod +x scripts/run-update-visit-stats.sh
# Test run (works any time; uses ?test=1)
./scripts/run-update-visit-stats.sh test
# Production run (only does work when server hour is 3)
./scripts/run-update-visit-stats.sh
```

Optional env: `CRON_BASE_URL` (default `http://localhost:3000`). Set to `https://yourdomain.com` if the cron calls the app via the public URL.

**3. Add crontab entry**

Run `crontab -e` and add (schedule = 3:00 AM server time, daily). Replace `/path/to/tpk-admin-3` with your actual project root:

```cron
# Visit stats: daily at 3:00 AM (server timezone)
0 3 * * * cd /path/to/tpk-admin-3 && ./scripts/run-update-visit-stats.sh >> /var/log/visit-stats-cron.log 2>&1
```

- **Timezone:** To use a specific timezone, set `TZ` in the line, e.g.:  
  `0 3 * * * TZ=Asia/Kolkata cd /path/to/tpk-admin-3 && ./scripts/run-update-visit-stats.sh ...`
- **Quiet:** To skip logging, use `> /dev/null 2>&1` instead of `>> /var/log/visit-stats-cron.log 2>&1`.

**4. One-liner without the script**

If you prefer not to use the script, read the secret from `.env` in the cron line (replace `/path/to/tpk-admin-3` and the URL if needed):

```cron
0 3 * * * curl -s -H "Authorization: Bearer $(grep CRON_SECRET /path/to/tpk-admin-3/.env | cut -d= -f2-)" "http://localhost:3000/self-study/api/cron/update-visit-stats" >> /var/log/visit-stats-cron.log 2>&1
```

**5. Test run (any time)**

Without waiting for 3 AM, run:

```bash
./scripts/run-update-visit-stats.sh test
```

Or with curl (set `CRON_SECRET` in env or replace it):

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/self-study/api/cron/update-visit-stats?test=1"
```

Expected response: `{"ok":true,"message":"Visit stats updated (visited entities only – test run)",...}`.

---

## 3. Why visit count isn’t updating / “Cron schedule not working”

**Two separate things:**

1. **Running the job manually (browser or curl)**  
   The API only runs the update when either:
   - It’s **3:00–3:59 AM server time**, or  
   - You add **`&test=1`** to the URL.  
   If you call at 5 AM without `test=1`, you get “Cron only runs between 3:00 AM…” and **no update runs**.  
   **Fix:** Use  
   `https://your-domain/self-study/api/cron/update-visit-stats?secret=YOUR_SECRET&test=1`  
   (same secret as in `.env`, and **must** include `&test=1` to run outside 3–4 AM).

2. **Automatic run at 3 AM**  
   The API **does not run by itself**. Nothing calls it until you set up a **cron job** (crontab or scheduler) on the server that hits the URL at 3:00 AM (server time).  
   **Fix:** Add a crontab entry (see section 2) so that at 3 AM something runs, e.g.:  
   `curl -s "https://app.testprepkart.in/self-study/api/cron/update-visit-stats?secret=YOUR_SECRET"`  
   (no `test=1` needed when the request is at 3 AM).

**Summary:** Use **`?secret=1234&test=1`** to run and update counts **now**. Use a **crontab at 3 AM** to run and update counts **every day** automatically.

---

## 4. Quick checks

- **Visit tracking:** Open any content page (e.g. exam, subject, chapter). In dev you should see `[VisitTracking]` logs; one POST to `/api/analytics/track-visit` per page (after optional check-ip).  
- **Cron:** Call `GET /self-study/api/cron/update-visit-stats?secret=YOUR_SECRET&test=1`. Response should be `ok: true` and list `byLevel` for all 7 levels (or zeros if no visit data).  
- **DB:** After the cron, exam/subject/unit/chapter/topic/subtopic/definition documents that have visits should have `visitStats` populated/updated.
