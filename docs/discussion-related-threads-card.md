# Related Threads Card (Discussion Forum)

## Overview

The **Related threads** card appears in the sidebar of the **Thread Detail** view (when a user opens a single discussion thread). It shows other threads from the same section so users can discover and jump to related discussions without going back to the list.

## Location

- **Component:** `DiscussionForumTab.jsx`
- **Sub-component:** `ThreadDetail`
- **UI:** Sidebar card titled **"Related threads"** (replaces the previous static "Related Topics" placeholder).

## Behaviour

### What it shows

- **Up to 5 threads** from the same hierarchy as the current thread (same exam, subject, unit, chapter, topic, subtopic, or definition).
- **Excludes the current thread** so the open thread is not listed.
- For each related thread:
  - **Title** (line-clamped to 2 lines).
  - **Meta line:** `"X replies • Chapter name"` (or subject name, or "General" if no chapter/subject).

### When it loads

- Related threads are fetched **after** the current thread has loaded.
- Fetch runs only when:
  - The current thread exists, and
  - At least one hierarchy ID is present (examId, subjectId, unitId, chapterId, topicId, subTopicId, or definitionId).
- If there is no hierarchy (e.g. general discussions), the card does not request related threads.

### States

| State        | UI |
|-------------|----|
| **Loading** | 3 skeleton placeholder bars. |
| **Empty**   | Message: *"No other threads in this section yet."* |
| **Has data**| List of clickable related threads + **"View all discussions"** button. |

### User actions

- **Click a related thread**  
  Opens that thread in the same view (same as opening from the list). Implemented by calling `onOpenThread(thread)` so the parent updates the URL and re-renders `ThreadDetail` with the new thread slug.

- **Click "View all discussions"**  
  Returns to the discussion list for the current section (calls `onBack()`).

## Data flow

### Fetch

- **API:** `GET /discussion/threads`
- **Query params:** Same hierarchy as the current page (`examId`, `subjectId`, `unitId`, `chapterId`, `topicId`, `subTopicId`, `definitionId`), plus `limit=6` and `page=1`.
- **Response:** List of threads (same shape as the main list). Current thread is filtered out by `slug`; up to 5 are kept for display.

### Props

- **ThreadDetail** receives `onOpenThread` from the parent (`DiscussionForumTab`).
- **Parent** passes `onOpenThread={handleThreadClick}` so that clicking a related thread uses the same navigation logic as the list (builds path via `getThreadDetailPath(thread)` and updates `?tab=discussion&thread=<slug>`).

## Code references

- **State:** `relatedThreads`, `relatedLoading` inside `ThreadDetail`.
- **Fetch:** `fetchRelatedThreads` (useCallback), triggered in a `useEffect` when `thread` is set.
- **Card markup:** Sidebar block that conditionally renders loading skeletons, empty message, or the list of related threads and the "View all discussions" button.

## Summary

| Item | Detail |
|------|--------|
| **Purpose** | Show related threads from the same section and let users open them or go back to the list. |
| **Data source** | `GET /discussion/threads` with current hierarchy, client-side filter by current slug. |
| **Display** | Up to 5 threads; title + reply count + chapter/subject. |
| **Navigation** | Related thread click → `onOpenThread(thread)`; "View all" → `onBack()`. |
