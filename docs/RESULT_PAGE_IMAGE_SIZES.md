# Result & blog — image sizes and ratios

Use this when exporting artwork or pasting image URLs in admin. This file reflects the **current code behavior** for result and blog pages.

---

## Result page

Public UI: `app/(main)/[exam]/result/ResultPageClient.jsx`.

### Text hero (first banner)

- **Type:** Gradient only — no image asset.
- **Approximate min-heights:** **200px** (default) → **220px** (`sm`) → **240px** (`md+`).
- **Note:** Long titles/subtitles can grow the block beyond those mins.

### Dual banner (second row — left / right images)

Admin: **Banner row — left / right image URL** (legacy single `bannerImage` can fill the left slot if both are empty).

| Viewport | Aspect ratio | Example export (per image) |
|----------|----------------|-----------------------------|
| &lt; `sm` | **16 : 10** | 1600 × 1000 |
| `sm` and up | **21 : 9** | 2560 × 1097 |

- **Fit:** `object-cover`, centered.

### Topper & target achiever cards

- **Frame:** **16 : 10**, full width of the card.
- **Fit:** `object-cover`, centered.
- **Grid:** 3 columns from `md` up.

---

## Blog

Public UI:

- List / cards: `app/(main)/[exam]/blog/BlogCard.jsx`, grids in `BlogListClient.jsx` and `AssignedBlogsSectionClient.jsx`.
- Post detail cover: `app/(main)/[exam]/blog/[slug]/page.js`.
- Inline images in the article body: rendered via **RichContent** inside the article `prose` wrapper on that page.

### Blog list card thumbnail

- **Frame:** No forced fixed ratio now (container uses natural image height).
- **Image props:** `width={827}`, `height={312}` as intrinsic baseline for optimization/layout hints.
- **Rendered size:** `w-full h-auto` (takes full card width, height adjusts automatically).
- **Fit:** `object-contain`, centered — no stretch and no crop.
- **Grid:** 1 column (mobile) → 2 (`md`) → 3 (`lg`).
- **Recommended upload:** Keep a landscape banner like **827×312** (or multiples such as **1654×624**) for visual consistency across cards.

### Blog post — cover image (detail page, above article body)

- **Layout:** Cover is merged into the main article card and spans full card width.
- **Image props:** `width={827}`, `height={312}` baseline.
- **Rendered size:** `w-full h-auto` (full-width image, auto height).
- **Fit:** `object-contain` — no stretch and no crop.
- **`http://` URLs:** `next/image` uses `unoptimized`; **`https://`** uses the default optimizer when allowed.

### Inline images (rich text / HTML content)

- **Width:** `max-w-full`, centered block — won’t spill outside the article.
- **Height:** Capped at about **`min(720px, 85vh)`** with **`height: auto`** so extremely tall screenshots don’t dominate the page; natural aspect ratio is kept (no forced stretch).

---

## Quick reference

| Area | Ratio / behavior | Example size |
|------|------------------|--------------|
| Result text hero | No image | — |
| Result dual banner | **16∶10** → **21∶9** (`sm+`) | 1600×1000 / 2560×1097 |
| Result topper / target | **16∶10** | 1600×1000 |
| Blog list card | Full width + auto height (`w-full h-auto`) | 827×312 (recommended) |
| Blog detail cover | Full width + auto height (`w-full h-auto`) | 827×312 (recommended) |
| Blog inline (prose) | Full width, max height cap | Any; wide ≤ content column |

---

## Sections without images

- Result: highlights, testimonials, CTA.
- Blog: comments and text-only blocks (no extra image slots beyond cover + editor content).
