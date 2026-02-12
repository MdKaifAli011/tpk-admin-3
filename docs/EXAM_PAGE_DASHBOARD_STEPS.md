# Dashboard on Exam Page – Step-by-Step Plan (No New Route)

**Goal:** Show the preparation dashboard **on the same exam page** (e.g. `/neet` or `/self-study/neet`). No separate dashboard route.

---

## Quick visual

```
EXAM PAGE (e.g. /neet or ?tab=dashboard)
┌─────────────────────────────────────────────────────────┐
│  [Exam name]  [Description]              [Progress %]  │
├─────────────────────────────────────────────────────────┤
│  Dashboard | Overview | Discussion | Practice | Perf     │  ← Click "Dashboard"
├─────────────────────────────────────────────────────────┤
│                                                         │
│   📅 Exam date + Prep days remaining                    │  ← Step 2
│   📊 Overall % + Physics / Chemistry / Biology %        │  ← Step 3
│   📚 Syllabus: Subject → Unit → Chapter [sliders]       │  ← Step 4
│   🎯 Next you should do today: Biology – Cytology       │  ← Step 5
│   📈 Readiness: Mocks, Accuracy, placeholders           │  ← Step 6
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Where It Will Appear

**Current exam page structure:**
```
[Exam header: name + description + progress bar]
[Tabs: Overview | Discussion Forum | Practice Test | Performance]
[Navigation: Back to Home | Prev/Next exam]
[Comments]
```

**After adding dashboard:**
```
[Exam header: name + description + progress bar]   ← unchanged
[Tabs: Dashboard | Overview | Discussion Forum | Practice Test | Performance]   ← add "Dashboard" tab
[Navigation]
[Comments]
```

When the user opens the exam page and clicks the **Dashboard** tab, they see all preparation content (exam date, progress, syllabus tracker, priority plan, etc.) on the **same URL** (e.g. `?tab=dashboard`). No new route like `/neet/dashboard`.

---

## 2. Big Picture in 6 Steps

| Step | What you do | Result |
|------|-------------|--------|
| **Step 1** | Add a "Dashboard" tab to the exam page tabs. | Tab appears; content can be "Coming soon" or a simple title. |
| **Step 2** | Add the "Exam date + countdown" block inside the Dashboard tab. | User sees exam date, days left, optional "study hours left". |
| **Step 3** | Add the "Progress summary" block (overall + subject-wise). | User sees overall % and Physics/Chemistry/Biology (or per-subject) %. |
| **Step 4** | Add the "Syllabus tracker" (Subject → Unit → Chapter with sliders). | User can update chapter completion on this page; data from existing progress APIs. |
| **Step 5** | Add "Next you should do today" + optional "Priority plan". | 1–3 suggested chapters based on weightage + completion. |
| **Step 6** | Add "Readiness metrics" + placeholders (mocks, accuracy, NRI). | Numbers from test results + placeholders for future features. |

Each step is independent: you can stop after Step 2 and have a useful page, then add Step 3, etc.

---

## 3. Step-by-Step (Easy Order)

### Step 1 – Add the "Dashboard" tab

**Where:** Exam page uses `TabsClient` in `app/(main)/[exam]/page.js`. Tabs are defined in `TabsClient.jsx` (e.g. `TABS = ["Overview", "Discussion Forum", ...]`).

**What to do:**
1. Add **"Dashboard"** to the list of tabs (e.g. as first tab: `["Dashboard", "Overview", ...]`).
2. Add URL param mapping: e.g. `tab=dashboard` when Dashboard is selected (same way as `overview`, `discussion`, etc.).
3. When active tab is "Dashboard", render a **new client component** (e.g. `ExamDashboardTab.jsx`) that for now only shows a heading like "Preparation Dashboard" or "Syllabus + Progress".

**Result:** On the exam page, user sees a Dashboard tab; clicking it shows one new component. No new route.

---

### Step 2 – Exam date + countdown block

**Where:** Inside `ExamDashboardTab.jsx` (or whatever you named the Dashboard tab content).

**What to do:**
1. **Data:** You need an exam date (e.g. 05 May 2026). Add a field `examDate` (Date) to the **Exam** model, and let admin set it in Exam Management. Or use a config/settings value for "NEET 2026 date" if you prefer not to change the model yet.
2. **UI:** One small block at the top of the Dashboard tab:
   - "NEET Exam Date: 05 May 2026" (or from exam/examDetails).
   - "Prep days remaining: X days" (examDate − today).
   - Optional: "Study hours left: Y hours (assuming 3 hrs/day)" (you can compute later from chapter time + completion; for Step 2 you can show a placeholder or skip).

**Result:** User sees exam date and countdown on the Dashboard tab.

---

### Step 3 – Progress summary (overall + subject-wise)

**Where:** Same Dashboard tab component, below the exam date block.

**What to do:**
1. **Overall %:** You already have `ExamProgressClient` on the exam header. In the Dashboard tab you can either:
   - Reuse the same exam progress (call existing API `GET /api/student/progress/exam?examId=...`) and show a big "Overall: 42%" with a progress bar, or
   - Show a short line like "Overall syllabus: 42%" and reuse your existing `ProgressBar` component.
2. **Subject-wise:** For each subject (Physics, Chemistry, Biology for NEET), you already have subject progress (from units). So:
   - Fetch progress per subject (existing APIs or one bulk call if you add it).
   - Show 3 cards or 3 rows: "Physics 35%", "Chemistry 46%", "Biology 52%" (or with labels like "On Track" / "Needs Push" based on simple % bands, e.g. &gt;50% = On Track).
3. **Data:** No new backend needed; use `GET /api/student/progress/exam` and per-subject progress (from units) like `SubjectProgressClient` does.

**Result:** User sees overall and subject-wise progress on the Dashboard tab.

---

### Step 4 – Syllabus tracker (Subject → Unit → Chapter + sliders)

**Where:** Same Dashboard tab, below progress summary.

**What to do:**
1. **Data:** You already have `subjectsWithUnits` passed to `TabsClient` from the exam page (subjects and their units). You still need **chapters per unit**. Either:
   - Pass chapters from the exam page (e.g. for each unit, fetch chapters and attach), or
   - In the Dashboard tab component, fetch tree (e.g. `fetchTree({ examId })`) so you get Subject → Unit → Chapter.
2. **UI:** For each subject, show units; for each unit, show chapters. For each chapter, show a **slider** (0–100%) and the chapter name. You already have:
   - `ChapterProgressItem` (chapter row with slider) and
   - `useProgress(unitId, chapters)` (load/save progress for that unit).
3. **Logic:** Reuse the same progress APIs: when user moves a slider, call the same POST/update you use on the chapter page (e.g. via `useProgress`). So the Dashboard tab is just another "view" over the same data; no new progress model or API.

**Result:** User can update chapter completion (sliders) from the exam page Dashboard tab. Progress is saved with existing APIs.

---

### Step 5 – "Next you should do today" + priority plan

**Where:** Same Dashboard tab, below syllabus tracker (or above it if you prefer).

**What to do:**
1. **Idea:** Suggest 1–3 chapters that are (a) not 100% complete and (b) "high value" (e.g. by `Chapter.weightage` or by a simple priority you define). Optionally use "daily hours" (e.g. 2 hrs) to pick how many chapters to show.
2. **Data:** From the same tree + progress you already have: list of chapters with their current completion % and `weightage` (and maybe `time`). Sort by: e.g. high weightage first, then low completion first. Take top 1–3.
3. **UI:** One block: "Next you should do today (e.g. 2 hrs):" then 1–3 lines like "Biology – Cytology: target +15%, ~1 hr". No new API required if you already have tree + progress in the Dashboard tab.

**Result:** User sees a short "today" suggestion based on syllabus and progress.

---

### Step 6 – Readiness metrics + placeholders

**Where:** Same Dashboard tab, one more block.

**What to do:**
1. **Mocks count:** If you have tests marked as "mock", count them from `StudentTestResult` (e.g. by examId). You can add a small API like `GET /api/student/readiness?examId=...` that returns `{ mockCount, averageAccuracy }` or compute in the Dashboard tab if you already load test results.
2. **Accuracy:** Same source: average of `percentage` from recent `StudentTestResult` for this exam.
3. **UI:** Show "No. of Mocks: 3", "Accuracy (mixed): 82% – aim 80–85%". Add placeholders: "PYQ coverage", "Error log", "NRI checklist" with buttons like "Open Error Log" / "Download NRI Checklist" that can link to future pages or static content.

**Result:** Dashboard tab shows real mock count and accuracy, plus placeholders for the rest.

---

## 4. File Checklist (What Touches What)

| Step | Files you’ll touch (idea only) |
|------|---------------------------------|
| 1 | `TabsClient.jsx` (add "Dashboard" to TABS, add tab param, render new component); new file `ExamDashboardTab.jsx` (or `DashboardTab.jsx`). |
| 2 | `Exam` model (optional: add `examDate`); admin Exam form (optional); `ExamDashboardTab.jsx` (exam date + countdown block). |
| 3 | `ExamDashboardTab.jsx` (progress summary block; call existing progress APIs). |
| 4 | `ExamDashboardTab.jsx` (syllabus tree + sliders); reuse `ChapterProgressItem` and `useProgress` or same API calls. Exam page may pass `subjectsWithUnits` + chapters or Dashboard fetches tree. |
| 5 | `ExamDashboardTab.jsx` (priority logic + "next today" block; use tree + progress + chapter weightage). |
| 6 | Optional small API `readiness` or use existing test APIs; `ExamDashboardTab.jsx` (readiness block + placeholders). |

---

## 5. Summary

- **Where:** Everything is on the **exam page** (e.g. `/neet`), in a new **Dashboard** tab. Same route, no `/dashboard` page.
- **Order:** Add tab (1) → exam date (2) → progress summary (3) → syllabus tracker with sliders (4) → "next today" (5) → readiness + placeholders (6).
- **Reuse:** Existing progress APIs, `ExamProgressClient`-style calls, `ChapterProgressItem`, `useProgress`, tree/subjectsWithUnits, `StudentTestResult` for mocks/accuracy.
- **New:** One new tab, one new tab component (`ExamDashboardTab`), optional `examDate` on Exam model and optional small readiness API. Everything else stays on the same exam page.

This keeps the idea simple: one place (exam page), one tab (Dashboard), add blocks step by step.
