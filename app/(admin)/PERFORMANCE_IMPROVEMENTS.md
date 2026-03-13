# Admin Performance Improvements – Reduce Load Time on VPS

This document summarizes findings from a deep read of `app/(admin)` and gives **concrete ideas** to reduce data load and improve performance. Your backend APIs already support **pagination** (`parsePagination`, `createPaginationResponse` in `app/api/*/route.js`).

---

## 1. Current Bottlenecks (Summary)

| Area | Issue | Impact |
|------|--------|--------|
| **Exam list** | No `limit` – loads ALL exams | Heavy first load on Exam page |
| **Unit/Chapter/Topic/SubTopic/Definition lists** | `limit=10000` in one request | Very large payloads, slow on VPS |
| **Dropdowns** | `limit=1000` or `10000` for exams/subjects | Repeated big fetches across pages |
| **Mount fetches** | `fetchExams()` then `fetchSubjects()` – sequential | Unnecessary wait; can run in parallel |
| **Sidebar** | Discussion + overview-comment counts refetched on **every** `window` focus | Extra API calls when switching tabs |
| **No shared cache** | Same resource (e.g. exams) fetched again on each page | Duplicate work, no SWR/React Query |
| **Filter state lost on navigation** | All management list pages | User filters (e.g. exam/subject), navigates away, comes back → filter reset; re-select every time; extra fetches |
| **No pagination / huge limit** | Exam (no limit), Unit/Chapter/Topic (limit=10000) | Heavy payload, slow VPS; no page size choice (50/100/500/1000) |
| **Discussion “Create thread”** | 6 sequential `.then()` for hierarchy dropdowns | Slow form load; can parallelize when parent IDs exist |

---

### I. **Persist filter state across navigation** (high impact – UX + performance)

**Problem:** On every management page (Exam, Subject, Unit, Chapter, Topic, Sub Topic, Definitions) we filter by level (e.g. Exam, Subject). After navigating away (e.g. to a detail page or another section) and coming back, the filter is reset and we have to select again. This repeats every time and hurts both UX and performance (re-fetching, re-selecting).

**Solution:**
- **Persist filter state** (e.g. selected examId, subjectId, metaFilter, searchQuery) and **pagination** (page, limit) when the user applies filters or changes page/size.
- **On load:** Restore from **URL search params** first (so back button and shared links work), then from **sessionStorage** (keyed by page, e.g. `admin-unit-filter`), then defaults.
- **On filter/page change:** Save to sessionStorage and optionally sync URL with `router.replace` so the current view is reflected in the address bar.
- Apply this pattern to all management list pages: Exam, Subject, Unit, Chapter, Topic, Sub Topic, Definitions (and any other that has a filter UI).

**Files to touch:** Each `*Management.jsx` that has filters; a shared hook e.g. `useFilterPersistence(storageKey, defaultState)` can read/write URL + sessionStorage and return state + setters so we don’t repeat logic.

---

### J. **Pagination: page size 50, 100, 500, 1000** (high impact)

**Problem:** Lists either load everything (no limit or limit=10000), which is slow on the VPS and forces re-filter every time after navigation.

**Solution:**
- Add **server-side pagination** with a **page size selector**: **50, 100, 500, 1000** (default **50** for first load).
- **Initial load:** Use `limit=50` (or saved value from persisted state) and `page=1`.
- **Persist** `page` and `limit` together with filter state (§I) so when the user returns to the page, both filter and pagination are restored.
- Show **pagination controls** (prev/next, page numbers if needed) and **“Per page: 50 | 100 | 500 | 1000”**.
- Backend already supports `page` and `limit`; use `response.data.pagination` (total, totalPages, hasNextPage, etc.) for the UI.

**Constants:** e.g. `ADMIN_PAGE_SIZE_OPTIONS = [50, 100, 500, 1000]`, `ADMIN_DEFAULT_PAGE_SIZE = 50`. Use these across all admin list pages.

---

## 2. Ideas to Implement (Priority Order)

### A. Add `limit` + pagination to list pages (high impact)

- **ExamManagement**  
  - Today: `api.get(\`/exam?status=all&metaStatus=${metaFilter}\`)` (no limit).  
  - Change: Add `&limit=50&page=1` (or 100), and use `response.data.pagination` if the API returns it. Add “Load more” or table pagination (e.g. page 1,2,3).
- **SubjectManagement, UnitManagement, ChapterManagement, TopicManagement, SubTopicManagement, DefinitionManagement**  
  - Today: Main list uses `limit=10000`.  
  - Change: Use a smaller default (e.g. `limit=50` or `100`) and `page=1`. Add pagination controls; optionally keep “Show all” for power users with a higher limit.

**Backend:** Already supports `page` and `limit` in exam, unit, chapter, topic, subtopic (and likely subject/definition) routes.

---

### B. Parallelize independent fetches on mount (quick win)

In **UnitManagement**, **ChapterManagement**, **TopicManagement**, **SubTopicManagement**:

- Today: `fetchExams(); fetchSubjects();` (or similar) – one after the other.
- Change: `Promise.all([fetchExams(), fetchSubjects()])` so both run in parallel. Same for any other independent dropdown data (e.g. exams + subjects in DefinitionManagement).

Reduces initial wait time without changing UI.

---

### C. Sidebar counts: debounce + optional stale-while-revalidate

- Today: `fetchDiscussionCounts` and `fetchOverviewCommentPendingCount` run on mount and on **every** `focus` (e.g. switching browser tabs).
- Ideas:
  1. **Debounce** focus: refetch only if last fetch was > 60–120 seconds ago (in-memory timestamp).
  2. **Optional**: Show previous count immediately and refetch in background; update when new data arrives (stale-while-revalidate).

Reduces unnecessary load on VPS when admins switch tabs often.

---

### D. Shared request cache (medium effort, high benefit)

- Today: Each admin page fetches exams/subjects/units etc. again; only per-page list caches (e.g. `examListCache`) avoid refetch when going list → detail → list.
- Idea: Introduce a **small request cache** (or use **SWR** / **React Query**):
  - Cache key = e.g. `exam?status=all&limit=100&page=1`.
  - TTL = 1–2 minutes (or until mutation invalidates).
  - All components (ExamManagement, SubjectManagement, dropdowns in Unit/Chapter/Topic, Discussion, BulkImport, etc.) use the same cache so the same list is not re-fetched on every page visit.

This cuts duplicate API calls and speeds up navigation.

---

### E. Discussion “Create thread” hierarchy load

- Today: When user selects Exam → Subject → Unit → … each step triggers the next dropdown load in sequence (6 `.then()` chains).
- Idea: When opening the form, if you already have default or previous selection, load **all** hierarchy levels in parallel (e.g. `Promise.all([fetchSubjects(examId), fetchUnits(examId, subjectId), ...])` where IDs are known). Otherwise keep current cascade for “choose one by one”. Reduces perceived latency when editing or when IDs are pre-filled.

---

### F. Auth check in layout

- Today: Every admin navigation runs `api.get("/auth/verify")` in layout; full content waits until it finishes.
- Ideas:
  1. **Short-lived client cache**: If verify succeeded in the last N seconds (e.g. 30–60), skip refetch and consider user still valid; refetch in background and only redirect if that fails.
  2. Keep current behavior for login/register and first load after login.

Reduces repeated verify calls and speeds up in-admin navigation.

---

### G. Lazy load heavy components

- Identify admin pages that load large tables or heavy UI (e.g. DefinitionManagement with big lists). Use `next/dynamic` with `ssr: false` or lazy load tables so the shell renders first and the heavy part loads after.

---

### H. Backend (if you control it)

- Ensure list endpoints **always** use `limit` (default e.g. 50) when not provided, to avoid accidental “return all”.
- Add **indexes** on frequently filtered fields (e.g. `examId`, `subjectId`, `status`, `metaStatus`) so list queries stay fast as data grows.
- Consider **cursor-based pagination** for very large tables if offset becomes slow.

---

## 3. Where Things Are (Quick Reference)

| What | Where |
|------|--------|
| Auth verify on every nav | `app/(admin)/layout.js` (useEffect) |
| Sidebar discussion/overview counts | `app/(admin)/layouts/Sidebar.jsx` (fetchDiscussionCounts, fetchOverviewCommentPendingCount, focus listeners) |
| Exam list – no limit | `components/features/ExamManagement.jsx` – fetchExams() |
| Unit list – limit 10000, sequential exam+subject | `components/features/UnitManagement.jsx` |
| Chapter/Topic/SubTopic – same pattern | `ChapterManagement.jsx`, `TopicManagement.jsx`, `SubTopicManagement.jsx` |
| Definition list + dropdowns | `DefinitionManagement.jsx` |
| Discussion create-thread cascade | `DiscussionManagement.jsx` (e.g. lines 376–429) |
| List caches | `lib/examListCache.js`, `lib/subjectListCache.js`, etc.; `lib/listCacheInvalidation.js` |
| API (axios) | `lib/api.js` |

---

## 4. Next Steps

- **Immediate:** Implement **§I (filter persistence)** and **§J (pagination 50/100/500/1000)** on all management list pages; use a shared hook and constants so behaviour is consistent and performance improves (less data per request, no re-filter after navigation).
- Pick 1–2 other items from **§2** (e.g. **B** + **A** for one list) and implement; measure load time before/after.
- Add your own ideas below (or in a separate section) and we can fold them into a single plan.

---

## 5. Implemented (Done)

| Item | What was done |
|------|----------------|
| **I + J** | **Filter persistence** and **pagination 50/100/500/1000** on **Exam**, **Unit**, **Subject**, **Chapter**, **Topic**, **SubTopic**, **Definition** management. Shared hook `useFilterPersistence(storageKey, defaultState)` restores from URL → sessionStorage → defaults; persists on change. Reusable `PaginationBar` component. |
| **A** | **Exam**, **Unit**, **Subject**, **Chapter**, **Topic**, **SubTopic**, **Definition** use server-side `page` and `limit` (50/100/500/1000); APIs already supported it. |
| **B** | **Parallelize mount fetches:** UnitManagement, ChapterManagement, TopicManagement, SubTopicManagement, DefinitionManagement use `Promise.all([fetchExams(), fetchSubjects()])` on mount so dropdown data loads in parallel. |
| **C** | **Sidebar counts debounce:** Discussion and Overview Comment counts refetch on window focus only if last fetch was **> 60 seconds** ago; event-based updates (e.g. after approve) still update immediately. |
| **F** | **Auth verify cache:** Admin layout skips `/auth/verify` if last success was **< 45 seconds** ago; shows cached auth and refetches in background; only redirects if background verify fails. |

**Optional (not yet done):** **D** (shared request cache), **E** (Discussion Create thread parallel hierarchy), **G** (lazy load heavy tables).

---

*Generated from a deep read of `app/(admin)` components, layouts, lib, and API usage.*
