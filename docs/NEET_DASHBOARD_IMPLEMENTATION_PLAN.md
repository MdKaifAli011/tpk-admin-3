# NEET Preparation Dashboard – Implementation Plan (Detailed)

This document maps your **NEET AI Preparation Dashboard** vision to the existing codebase and gives a **detailed, step-by-step** implementation plan. The dashboard lives **on the exam page** as a tab (no separate route).

---

## 1. Your Vision (Summary)

- **Product:** NEET Preparation Dashboard – Syllabus + Practice + Timeline.
- **Tagline:** Track, predict & prioritize what to study next.
- **Core interaction:** Update chapter completion via **sliders**; dashboard computes unit → subject → overall progress, estimates hours, and suggests a **priority-based study plan** (high ROI chapters first).
- **Sections you want:**
  - **Syllabus Tracker** – Subject → Unit → Chapter with sliders; roll up to overall %.
  - **Priority Plan** – Auto plan based on days left + daily hours; high ROI + low completion first.
  - **Revision + PYQs** – Readiness metrics (mocks, accuracy, NCERT coverage, PYQ coverage, error log, speed).
  - **NEET Exam Date** – Countdown (e.g. 05 May 2026), prep days remaining, study hours left, expected score/rank placeholders, weakest area, accuracy target.
  - **Preparation Progress** – Overall + subject-wise (On Track / Needs Push / High Risk), time-to-complete estimate.
  - **“Next you should do today”** – Target block (e.g. Biology – Cytology, 2 hrs).
  - **Readiness metrics** – Mocks count, accuracy %, NCERT/PYQ coverage, error log, timed blocks.
  - **NRI USA alignment** – Gap checklist (NCERT one-liners, examples, statement traps, India timeline).

---

## 2. Where the Dashboard Lives (Important)

**No new route.** The dashboard is **one tab** on the **existing exam page**.

- **URL:** Same as exam page, e.g. `/neet` or `/self-study/neet` with `?tab=dashboard`.
- **Page:** `app/(main)/[exam]/page.js` (unchanged; it already renders `TabsClient`).
- **Tabs:** Add **"Dashboard"** as the first tab: `Dashboard | Overview | Discussion Forum | Practice Test | Performance`.
- **Content:** When the user clicks **Dashboard**, the tab content area shows a single client component (e.g. `ExamDashboardTab.jsx`) that contains all dashboard blocks.

```
EXAM PAGE (e.g. /neet)
┌─────────────────────────────────────────────────────────────────────────┐
│  [Exam name]  [Description]                            [Progress %]      │
├─────────────────────────────────────────────────────────────────────────┤
│  Dashboard | Overview | Discussion Forum | Practice Test | Performance  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   📅 Exam date + Prep days + Study hours left                           │
│   📊 Overall % + Subject-wise % (On Track / Needs Push / High Risk)     │
│   📚 Syllabus Tracker: Subject → Unit → Chapter [sliders]              │
│   🎯 Next you should do today (1–3 chapters) + Set daily hours       │
│   ⏱ Time required to complete (days + hours)                           │
│   📈 Readiness: Mocks, Accuracy, PYQ, Error log, Speed                  │
│   🎯 Expected score/rank placeholders + Weakest area                    │
│   🌎 NRI USA alignment: checklist + Download + US-Friendly plan         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. What You Already Have (Project Mapping)

### 3.1 Data & APIs

| Concept | Status | Where |
|--------|--------|--------|
| **Exam** | ✅ | `Exam` model, slug, order; no `examDate` yet. |
| **Subject → Unit → Chapter** | ✅ | `Subject`, `Unit`, `Chapter` models; `fetchTree(examId)` returns full hierarchy. |
| **Chapter metadata** | ✅ | `Chapter`: `weightage`, `time`, `questions` (can drive priority/ROI). |
| **Chapter completion %** | ✅ | `StudentProgress` (per unit): `progress` Map of `chapterId → { progress, isCompleted, isManualOverride, manualProgress, autoCalculatedProgress, visitedItems }`. |
| **Unit progress** | ✅ | Rolled up from chapters in `StudentProgress.unitProgress`; updated on track-visit and calculate. |
| **Subject progress** | ✅ | `SubjectProgress` (per subject); **exam progress** = average of subject progress (API: `GET /api/student/progress/exam?examId=...`). |
| **Progress APIs** | ✅ | `GET/POST /api/student/progress` (unit), `GET/POST /api/student/progress/subject`, `GET /api/student/progress/exam`, track-visit, calculate. |
| **Manual slider** | ✅ | `ChapterProgressItem` + `useProgress`: slider updates chapter %, optional manual override; saves via POST progress. |
| **Test / mock scores** | ✅ | `StudentTestResult`: testId, exam/subject/unit/chapter/topic/subTopic, totalQuestions, correctCount, percentage, timeTaken, etc. |

### 3.2 Gaps vs Your Vision

| Need | Gap |
|------|-----|
| **Dashboard tab** | Add "Dashboard" tab and `ExamDashboardTab` component. |
| **Exam date + countdown** | Exam model has no `examDate`; add field + admin UI. |
| **On Track / Needs Push / High Risk** | Use simple % bands (e.g. ≥60% / 40–60% / &lt;40%); no new backend. |
| **Time to complete (days/hours)** | Compute from Chapter.time + completion %; optional daily hours in localStorage or API. |
| **Priority / “next today”** | Use Chapter.weightage + completion; sort and pick top 1–3; can be client-side. |
| **Readiness (mocks, accuracy)** | New small API or use StudentTestResult in dashboard; aggregate mock count + average %. |
| **Score/rank/weakest area** | Placeholders first; later from mocks + syllabus %. |
| **NRI checklist** | Static section + download CTA; optional checklist model later. |

---

## 4. Step-by-Step Implementation (Granular)

Each step is small and testable. Do them in order.

---

### STEP 1: Add the Dashboard tab (no dashboard content yet)

**Goal:** User sees a "Dashboard" tab on the exam page; clicking it shows a placeholder.

| Sub-step | What to do | Where |
|----------|------------|--------|
| 1.1 | Open `app/(main)/components/TabsClient.jsx`. Find the `TABS` array (e.g. `["Overview", "Discussion Forum", "Practice Test", "Performance"]`). | `TabsClient.jsx` |
| 1.2 | Add `"Dashboard"` as the **first** item: `["Dashboard", "Overview", "Discussion Forum", "Practice Test", "Performance"]`. | Same file |
| 1.3 | Add URL param mapping. Find helpers like `toUrlParam` and `fromUrlParam`. Add: for "Dashboard" ↔ `dashboard` (e.g. `tab=dashboard` in URL). | Same file |
| 1.4 | In the switch/conditional that renders tab content, add a case for `activeTab === "Dashboard"`. Render a simple placeholder: e.g. `<div className="p-6 text-center text-gray-600">Preparation Dashboard – Coming soon</div>`. Or import a new component and render it. | Same file |
| 1.5 | Create a new file `app/(main)/components/ExamDashboardTab.jsx`. It should be a client component (`"use client"`). Accept props: `examId`, `examSlug`, `examName`, `subjectsWithUnits` (same as TabsClient receives from exam page). For now, render only a heading: e.g. "Preparation Dashboard" and a short line of text. | New file `ExamDashboardTab.jsx` |
| 1.6 | In `TabsClient.jsx`, replace the Dashboard placeholder with `<ExamDashboardTab examId={examId} examSlug={examSlug} examName={entityName} subjectsWithUnits={subjectsWithUnits} />`. Ensure `examId`, `examSlug`, `entityName`, `subjectsWithUnits` are passed into `TabsClient` from the exam page (they already are). | `TabsClient.jsx` |

**Result:** On `/neet`, user sees tab "Dashboard"; clicking it shows the `ExamDashboardTab` component (heading only). No new route.

---

### STEP 2: Exam date + countdown block

**Goal:** Dashboard tab shows exam date and “Prep days remaining”.

| Sub-step | What to do | Where |
|----------|------------|--------|
| 2.1 | **Backend – Exam model.** Open `models/Exam.js`. Add optional field: `examDate: { type: Date, default: null }`. Run migration or ensure existing exams can have null. | `models/Exam.js` |
| 2.2 | **Admin – Exam form.** Open the admin Exam Management component (e.g. `ExamManagement.jsx`). Add a date input (or datetime-local) for `examDate`. On save (create/update), send `examDate` to the API. Ensure the API (e.g. `POST/PUT /api/exam` or similar) accepts and stores `examDate`. | Admin exam form + API |
| 2.3 | **API – Return examDate.** Ensure the exam fetch API (used by exam page) returns `examDate` in the exam object. If the exam page uses `fetchExamById` or `fetchExams`, the response should include `examDate`. | Exam API / `lib/api.js` |
| 2.4 | **Pass examDate to Dashboard tab.** The exam page fetches `exam`. Pass `exam.examDate` (or whole `exam`) into `TabsClient`. In `TabsClient`, pass it to `ExamDashboardTab`, e.g. `examDate={exam.examDate}` or `exam={exam}`. | `app/(main)/[exam]/page.js`, `TabsClient.jsx` |
| 2.5 | **UI – Exam date block.** In `ExamDashboardTab.jsx`, add a top section: "NEET Exam Date: [date]" (format examDate, or show "Not set" if null). Below it: "Prep days remaining: X days" = `examDate - today` (in days). Use a small utility: e.g. `Math.ceil((examDate - new Date()) / (24*60*60*1000))`. If no examDate, show "Set exam date in admin" or hide the block. | `ExamDashboardTab.jsx` |
| 2.6 | Optional: add a line "Study hours left: Y hours (assuming 3 hrs/day)" – for now you can use a placeholder number or skip; real calculation comes in Step 4/5. | Same component |

**Result:** Dashboard tab shows exam date and countdown. Admin can set exam date.

---

### STEP 3: Progress summary (overall + subject-wise + status labels)

**Goal:** Dashboard tab shows overall syllabus % and per-subject % with “On Track” / “Needs Push” / “High Risk”.

| Sub-step | What to do | Where |
|----------|------------|--------|
| 3.1 | **Fetch exam progress.** In `ExamDashboardTab.jsx`, on mount (or when `examId` is set), call `GET /api/student/progress/exam?examId=<examId>` with the student token (same as `ExamProgressClient`). Store result in state, e.g. `examProgress` (0–100). Handle unauthenticated: show 0 or “Log in to see progress”. | `ExamDashboardTab.jsx` |
| 3.2 | **UI – Overall %.** Render a block “Preparation Progress” or “Overall syllabus”. Show a progress bar (reuse `ProgressBar.jsx` from `components/`) and the number, e.g. “42%”. Use the same styling pattern as elsewhere (e.g. indigo/gray). | Same |
| 3.3 | **Fetch subject progress.** For each subject in `subjectsWithUnits`, you need that subject’s progress. Option A: For each subject, call `GET /api/student/progress/subject?subjectId=<id>`. Option B: Compute from units – for each subject, get all unit IDs, then for each unit call `GET /api/student/progress?unitId=<id>`, then average unit progress for that subject (same logic as `SubjectProgressClient`). Use Option A if the API returns subject progress; else Option B. | Same |
| 3.4 | **UI – Subject cards.** For each subject (e.g. Physics, Chemistry, Biology), show a small card or row: subject name + progress % + status label. Status: e.g. ≥60% = “On Track”, 40–60% = “Needs Push”, &lt;40% = “High Risk”. Use different border/background colors for each status. | Same |
| 3.5 | **Listen for updates.** When the user updates a chapter slider later (Step 4), exam and subject progress will change. Either refetch progress after each slider update (e.g. via a custom event or callback) or refetch on tab focus / interval. Easiest: after saving progress in the syllabus block, call the same exam + subject progress fetch again. | Same |

**Result:** Dashboard shows overall % and subject-wise % with status labels. Uses existing APIs only.

---

### STEP 4: Syllabus tracker (Subject → Unit → Chapter with sliders)

**Goal:** User sees the full tree and can change chapter completion with sliders; progress persists via existing APIs.

| Sub-step | What to do | Where |
|----------|------------|--------|
| 4.1 | **Get full tree with chapters.** The exam page passes `subjectsWithUnits` (subjects + units per subject). It does **not** include chapters. So either: (A) In the exam page, for each unit fetch chapters and attach to each unit, then pass to TabsClient; or (B) In `ExamDashboardTab`, call `fetchTree({ examId })` (from `lib/api.js`) to get the full tree (exam → subjects → units → chapters). Prefer (B) to avoid changing the exam page data load. Store tree in state (e.g. `tree` or `subjectsWithUnitsAndChapters`). | `ExamDashboardTab.jsx`, optionally `[exam]/page.js` |
| 4.2 | **Fetch progress per unit.** For each unit in the tree, you need progress (chapter-level). Call `GET /api/student/progress?unitId=<unitId>` for each unit. Store in a map: `unitId → { unitProgress, progress: { chapterId → { progress, isCompleted, ... } } }`. You can do this in parallel (Promise.all) once you have the list of unit IDs from the tree. | Same |
| 4.3 | **Render hierarchy.** For each subject → each unit → each chapter, render a row. Row content: subject name (as section header), unit name (as subheader), then for each chapter: chapter name + slider. Reuse **`ChapterProgressItem`** from `components/ChapterProgressItem.jsx`. It needs: `chapter`, `unitId`, `progress` (current %), `isCompleted`, `onProgressChange`, and optionally `href` for the chapter page. Check the existing props of `ChapterProgressItem` in the codebase and pass the same. | Same |
| 4.4 | **Wire progress updates.** `ChapterProgressItem` (or the parent) calls `onProgressChange(chapterId, progress, isCompleted)`. You must save this via the existing progress API. Option A: Use **`useProgress(unitId, chapters)`** from `hooks/useProgress.js` **per unit**. So for each unit you have a `useProgress(unitId, chaptersOfThatUnit)`. When a chapter in that unit changes, the hook’s `updateChapterProgress` will save via POST. Option B: In the dashboard, when `onProgressChange` fires, call `POST /api/student/progress` with `{ unitId, chapterId, progress: { ...fullChapterProgressObject }, unitProgress }` (same shape as existing). Option A reuses the hook; Option B is explicit. Prefer A if the hook can be used with multiple units (you may need one wrapper per unit). | Same + `useProgress.js` or direct API |
| 4.5 | **Collapsible sections (optional).** To avoid a very long page, make each subject (or unit) collapsible: click to expand/collapse. Store open state in React state (e.g. `openSubjectId`, `openUnitId`). | Same |
| 4.6 | **“How to use” text.** Add a short static block above or below the tracker: “Update chapter completion weekly. Keep Biology higher than Physics early. Track revision separately later.” | Same |

**Result:** Full syllabus tree with sliders; moving a slider updates and persists progress via existing APIs. Unit and subject progress roll up automatically when you refetch (Step 3.5).

---

### STEP 5: “Next you should do today” + time to complete + daily hours

**Goal:** Show 1–3 suggested chapters and “Time required to complete”; let user set daily hours.

| Sub-step | What to do | Where |
|----------|------------|--------|
| 5.1 | **Daily hours.** Store “daily study hours” (e.g. 3) in state. Optionally persist: `localStorage.setItem('dashboard_daily_hours', 3)` and read on load. Add a small control: “Set daily hours” or a number input + “Apply”. | `ExamDashboardTab.jsx` |
| 5.2 | **Remaining hours (syllabus).** For each chapter you have: `chapter.time` (hours), and completion % from Step 4. Remaining hours for that chapter = `(1 - completion/100) * chapter.time`. Sum over all chapters → “Study hours left (total)”. Show it in the exam date block or a separate line: “Study hours left: 384 hours”. | Same |
| 5.3 | **Time to complete.** “Time required to complete” = study hours left / daily hours = days. Show: “78 days (235 hours)” (or similar). Add a note: “Keep a buffer for revision + tests.” | Same |
| 5.4 | **Priority list.** Build a flat list of all chapters (from tree) with: `chapterId`, `chapterName`, `subjectName`, `unitName`, `weightage`, `time`, `completion` (from progress). Filter out 100% complete. Sort by: e.g. (1) higher weightage first, (2) lower completion first. Take top 1–3. | Same |
| 5.5 | **“Next today” block.** Render a section “Next you should do today (Target X hrs):”. For each of the 1–3 chapters, show: “Subject – Chapter name: target +Y%, ~Z hr” (Y = suggested increase, Z = chapter.time or portion). Optional: link to the chapter page (use existing slug structure: `examSlug/subjectSlug/unitSlug/chapterSlug`). | Same |
| 5.6 | Optional: “Generate weekly plan” button that shows the next 5–7 days of suggestions (same logic, maybe 1–2 chapters per day). Can be a simple modal or expandable section. | Same |

**Result:** User sees exam date, study hours left, time to complete, and “next today” suggestions. All computed from existing tree + progress + Chapter.time/weightage.

---

### STEP 6: Readiness metrics (mocks, accuracy, placeholders)

**Goal:** Show mock count and average accuracy; add placeholders for PYQ, error log, NRI.

| Sub-step | What to do | Where |
|----------|------------|--------|
| 6.1 | **Mock count + accuracy API.** Option A: Add a new route `GET /api/student/dashboard/readiness?examId=...`. Inside: verify student token, then query `StudentTestResult` for this student and examId. If you have a “type” or “category” on the test (e.g. “mock”), count those; else count all tests for that exam. Average `percentage` → accuracy. Return `{ mockCount, averageAccuracy }`. Option B: In the dashboard, fetch test results from an existing API (if any) and compute count + average client-side. | New `app/api/student/dashboard/readiness/route.js` or existing test API |
| 6.2 | **UI – Readiness block.** In `ExamDashboardTab`, add a section “Readiness metrics”. Show “No. of Mocks: X”, “Accuracy (mixed sets): Y% – aim 80–85%”. Use data from Step 6.1. | `ExamDashboardTab.jsx` |
| 6.3 | **Placeholders.** Add lines or buttons: “NCERT line coverage” (placeholder), “PYQ coverage” (placeholder), “Error log” → “Open Error Log” (button, can link to `#` or a future page), “Speed: timed 45-min blocks” (placeholder). “Mark PYQs Done” / “Update Accuracy” – same idea. | Same |
| 6.4 | Optional: “Open Error Log” opens a modal or navigates to a page that will later show tagged mistakes (concept/memory/careless). For now the button can do nothing or show “Coming soon”. | Same |

**Result:** Readiness section with real mock count and accuracy, plus placeholders and CTAs for future features.

---

### STEP 7: Expected score, rank, weakest area (placeholders)

**Goal:** Layout ready for future data; show placeholder text.

| Sub-step | What to do | Where |
|----------|------------|--------|
| 7.1 | Add a block “Score & Rank”. Text: “Expected NEET Score: 545–585 (placeholder)”, “Estimated Rank: 18k–30k (placeholder)”, “Your Weakest Area: Inorganic Recall / Statement Traps (placeholder)”. Add a small note: “(Update from mocks + accuracy later)”. | `ExamDashboardTab.jsx` |
| 7.2 | Optional: “Accuracy target: 80–85% in mixed sets (to reduce negative marking)” – can go in the readiness block or here. | Same |

**Result:** Score/rank/weakest area block with placeholders; no backend yet.

---

### STEP 8: NRI USA alignment

**Goal:** Static content + download/build CTAs.

| Sub-step | What to do | Where |
|----------|------------|--------|
| 8.1 | Add a section “NRI USA Alignment (Gap Checklist)”. Copy: “Gap Risk: Medium”, “NCERT one-liners: U.S. books explain, NEET asks exact phrasing.”, “Examples + Exceptions: memorize kingdom examples + exception points.”, “Statement Traps: practice NOT/Except + Assertion/Reason weekly.”, “India timeline: plan travel + board exams + NEET dates early.” | `ExamDashboardTab.jsx` |
| 8.2 | Buttons: “Download NRI Checklist” (can link to a static PDF or markdown file in `/public`, or `#` for now), “Build US-Friendly Plan” (can link to same page with a hash or future route). | Same |
| 8.3 | Later: optional checklist model (e.g. studentId, itemId, done) and checkboxes; for v1 static is enough. | — |

**Result:** NRI block with text and CTAs; no new API for v1.

---

## 5. File Checklist (Summary)

| Step | Files to create | Files to modify |
|------|-----------------|-----------------|
| 1 | `app/(main)/components/ExamDashboardTab.jsx` | `app/(main)/components/TabsClient.jsx` |
| 2 | — | `models/Exam.js`, admin Exam form (e.g. `ExamManagement.jsx`), exam API if needed, `[exam]/page.js` (pass examDate), `TabsClient.jsx` (pass to tab), `ExamDashboardTab.jsx` |
| 3 | — | `ExamDashboardTab.jsx` |
| 4 | — | `ExamDashboardTab.jsx` (tree fetch, progress fetch, render tree + ChapterProgressItem, useProgress or POST progress) |
| 5 | — | `ExamDashboardTab.jsx` |
| 6 | Optional: `app/api/student/dashboard/readiness/route.js` | `ExamDashboardTab.jsx` |
| 7 | — | `ExamDashboardTab.jsx` |
| 8 | — | `ExamDashboardTab.jsx` |

---

## 6. Technical Hooks (Reuse vs Add)

**Reuse as-is (no changes):**

- `fetchTree`, `fetchExamById`, `createSlug`
- `ChapterProgressItem`, `ProgressBar`, `useProgress` (per unit)
- `GET /api/student/progress/exam?examId=...`
- `GET /api/student/progress?unitId=...`
- `GET /api/student/progress/subject?subjectId=...`
- `POST /api/student/progress` (unit + chapter progress)
- `StudentTestResult` model for readiness

**Add when implementing:**

- **Exam:** `examDate` (Date, optional) in Exam model + admin form.
- **Optional:** `GET /api/student/progress/dashboard?examId=...` (bulk progress for all units of an exam) to reduce N unit calls.
- **Optional:** `GET /api/student/dashboard/readiness?examId=...` (mock count, average accuracy).
- **Frontend:** One tab + one component (`ExamDashboardTab`) that composes all blocks.

**Keep stable:** Do not change existing progress models or the behavior of existing progress APIs; the dashboard only reads and writes through them.

---

## 7. Summary: How to Make It “Perfect”

1. **One place** – Exam page only; Dashboard is a tab. Same URL, no `/dashboard` route.
2. **Reuse first** – Same sliders (`ChapterProgressItem`), same progress APIs, same tree; overall and subject % from existing endpoints.
3. **Add only what’s missing** – Exam date on Exam model; study hours / time to complete from Chapter.time + completion; priority from weightage + completion; readiness from StudentTestResult; rest placeholders or static.
4. **Step order** – Tab (1) → Date (2) → Progress (3) → Syllabus tracker (4) → Next today + time (5) → Readiness (6) → Score/rank placeholders (7) → NRI (8).
5. **Admin** – Exam date and chapter weightage/time are set in admin; dashboard only reads and suggests.

This plan gives you a detailed, step-by-step path to implement the NEET Preparation Dashboard on the exam page with no new route and minimal new code.
