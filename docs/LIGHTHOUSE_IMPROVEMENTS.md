# Lighthouse Improvement Action Plan

Based on a Lighthouse 13 run (Desktop, initial load). Use this as a checklist to improve scores and fix reported issues.

---

## Current scores (reference)

| Category        | Score | Target |
|----------------|-------|--------|
| Performance    | 97    | 90+ ✓  |
| Accessibility  | 84    | 90+    |
| Best Practices | 77    | 90+    |
| SEO            | 91    | 90+ ✓  |

---

## 1. Performance (97 – already strong)

- **FCP** 0.6s, **LCP** 0.6s, **TBT** 110ms, **CLS** 0.018, **SI** 1.3s – all in good range.
- **Insights** (optional improvements):
  - Document request latency (~510 ms) – consider edge/CDN and minimizing redirects.
  - Modern HTTP (~180 ms) – serve over HTTP/2 or HTTP/3 where possible.
  - Render-blocking requests (~170 ms) – defer non-critical JS/CSS; already using `optimizePackageImports` for react-icons/framer-motion.
- **Diagnostics**:
  - Reduce unused JavaScript (~155 KiB) – code-split and tree-shake; review large dependencies.
  - Long main-thread tasks (3) – break up heavy work or defer.
  - Non-composited animations (3) – prefer `transform`/`opacity` for animated elements.

No mandatory code changes; improvements are incremental.

---

## 2. Accessibility (84 → 90+)

### Done in codebase

- **Header**: `aria-label` added for:
  - Refresh visit stats button: `"Refresh visit stats"`.
  - Profile link: `"Profile settings"`.
  - Logout link: `"Logout"`.
- **Sidebar**: Close button already has `aria-label="Close menu"`.
- **Root layout**: `description` and other metadata come from `SEO_DEFAULTS` in `app/layout.js`.

### Remaining (manual or per-page)

- **Buttons without an accessible name**: Search for any `<button>` that only contains an icon and add `aria-label` (or visible text).
- **Links without a discernible name**: Ensure every `<Link>`/`<a>` has either visible text or `aria-label` describing the destination/action.
- **Contrast**: Fix any “Background and foreground colors do not have a sufficient contrast ratio” by increasing contrast (e.g. darker text or lighter background) to meet WCAG AA.
- **Touch targets**: Ensure interactive elements are at least 44×44 px (or have enough spacing). Adjust padding/min-height/min-width where needed.
- **Identical links, same purpose**: If multiple links go to the same URL with the same purpose, that’s OK; if they look identical but go to different places, differentiate them (e.g. by text or `aria-label`).

---

## 3. Best Practices (77 → 90+)

### Done in codebase

- **HSTS**: `Strict-Transport-Security` with long max-age and preload (in `next.config.mjs`).
- **X-Frame-Options**: `SAMEORIGIN` (clickjacking mitigation).
- **X-Content-Type-Options**: `nosniff`.
- **Referrer-Policy**: `origin-when-cross-origin`.
- **Permissions-Policy**: camera, microphone, geolocation restricted.
- **CSP**: `Content-Security-Policy` added in `next.config.mjs` (default-src, script-src, style-src, img-src, font-src, connect-src, frame-ancestors, base-uri, form-action).
- **COOP**: `Cross-Origin-Opener-Policy: same-origin` for origin isolation.

### Server / deployment

- **Trusted Types**: Requires application and dependency review; enable only after testing (e.g. in report-only mode).
- **Third-party cookies**: 2 cookies reported – identify which scripts set them; if from analytics/auth, document and consider consent or same-site alternatives.
- **Chrome DevTools Issues panel**: Fix or document any issues shown there (e.g. deprecated APIs, mixed content).

---

## 4. SEO (91 – already strong)

- **Meta description**: Root layout uses `SEO_DEFAULTS.DESCRIPTION` in `metadata.description`. If Lighthouse still reports “Document does not have a meta description”:
  - Confirm the **exact URL** Lighthouse ran on (e.g. `/self-study` vs `/`).
  - If the app uses `basePath` (e.g. `/self-study`), ensure the root layout applies to that path and that the built HTML includes `<meta name="description" content="...">` for that route.
- **Format HTML for crawlers**: Keep semantic structure (headings, main, nav, etc.); already in place in layout and pages.

---

## 5. Quick reference – where things live

| Item                    | Location |
|-------------------------|----------|
| Default meta description| `app/layout.js` + `constants/index.js` (`SEO_DEFAULTS`) |
| Security headers        | `next.config.mjs` → `headers()` |
| Header buttons/links    | `app/(admin)/layouts/Header.jsx` |
| Sidebar                 | `app/(admin)/layouts/Sidebar.jsx` |

---

## 6. Re-running Lighthouse

1. Open the URL you care about (e.g. `https://your-domain/self-study`).
2. DevTools → Lighthouse → select Performance, Accessibility, Best Practices, SEO.
3. Run and compare with this doc; fix any new failures and re-run until targets (e.g. 90+) are met.
