# Progress Calculation System - Complete Technical Report

**Date:** Generated on analysis  
**Version:** 1.0  
**Status:** Current Implementation Analysis + Recommendations

---

## Executive Summary

This report provides a comprehensive analysis of the progress tracking system for a multi-level learning platform. The system tracks student progress across **Subjects → Units → Chapters → Topics/Subtopics/Definitions** with support for both automatic calculation (based on content visits) and manual overrides.

**System Architecture:**
- **Base Level:** Chapter Progress (auto-calculated or manual)
- **Aggregation Level 1:** Unit Progress (average of chapters)
- **Aggregation Level 2:** Subject Progress (average of units)

**Key Features:**
- ✅ Automatic progress calculation from content visits
- ✅ Manual override capability (slider, "Mark as Done")
- ✅ Real-time updates across all levels
- ✅ Database persistence with localStorage caching
- ✅ Division by zero protection
- ✅ Edge case handling

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Chapter Progress Calculation](#2-chapter-progress-calculation)
3. [Unit Progress Calculation](#3-unit-progress-calculation)
4. [Subject Progress Calculation](#4-subject-progress-calculation)
5. [Data Flow Architecture](#5-data-flow-architecture)
6. [Storage Strategy](#6-storage-strategy)
7. [Edge Cases & Handling](#7-edge-cases--handling)
8. [Current Implementation Analysis](#8-current-implementation-analysis)
9. [Issues & Inconsistencies](#9-issues--inconsistencies)
10. [Recommendations](#10-recommendations)
11. [Comparison with ChatGPT Approach](#11-comparison-with-chatgpt-approach)

---

## 1. System Overview

### 1.1 Hierarchy Structure

```
Subject
  └── Unit (multiple)
      └── Chapter (multiple)
          └── Topic (multiple)
              └── Subtopic (multiple)
                  └── Definition (multiple)
```

### 1.2 Progress Calculation Levels

| Level | Calculation Method | Storage Location | Update Trigger |
|-------|-------------------|------------------|----------------|
| **Chapter** | Auto: `(visitedItems / totalItems) × 100`<br>Manual: User input | Database + localStorage | Content visit or manual change |
| **Unit** | `sum(chapterProgress) / totalChapters` | Database + localStorage | When any chapter updates |
| **Subject** | `sum(unitProgress) / totalUnits` | Client-side only | When any unit updates |

### 1.3 Progress Sources

**Two types of progress tracking:**

1. **Auto-Calculated Progress**
   - Triggered by: Student visits to topics, subtopics, definitions
   - Formula: Based on visited items vs. total items
   - Stored as: `autoCalculatedProgress`

2. **Manual Override**
   - Triggered by: User slider adjustment or "Mark as Done" checkbox
   - Formula: Direct user input (0-100%)
   - Stored as: `manualProgress` with `isManualOverride = true`

**Priority:** Manual override takes precedence over auto-calculated.

---

## 2. Chapter Progress Calculation

### 2.1 Formula

**Auto-Calculated Progress:**
```javascript
totalItems = totalTopics + totalSubtopics + totalDefinitions + totalChapter
visitedItems = visitedTopics + visitedSubtopics + visitedDefinitions + visitedChapter

if (totalItems > 0) {
    autoCalculatedProgress = Math.round((visitedItems / totalItems) * 100)
    autoCalculatedProgress = Math.min(100, Math.max(0, autoCalculatedProgress))
} else {
    autoCalculatedProgress = 0  // Empty chapter protection
}
```

**Final Chapter Progress:**
```javascript
if (isManualOverride) {
    chapterProgress = manualProgress
} else {
    chapterProgress = autoCalculatedProgress
}
```

### 2.2 Implementation Details

**Location:** 
- `app/api/student/progress/track-visit/route.js` (lines 104-174)
- `app/api/student/progress/calculate/route.js` (lines 52-69)

**Key Components:**

1. **Item Counting Function** (`getChapterItemCounts`)
   ```javascript
   // Counts all active items in chapter
   totalChapter = 1  // Chapter visit counts as 1 item
   totalTopics = topics.length
   totalSubtopics = subtopics.length
   totalDefinitions = definitions.length
   totalItems = totalChapter + totalTopics + totalSubtopics + totalDefinitions
   ```

2. **Visit Tracking**
   - When student visits topic/subtopic/definition → API tracks visit
   - Updates `visitedItems` array in chapter progress
   - Recalculates `autoCalculatedProgress`

3. **Manual Override**
   - User adjusts slider → `updateChapterProgress()` called
   - Sets `isManualOverride = true`
   - Stores `manualProgress` value
   - Auto-calculated value preserved in `autoCalculatedProgress`

### 2.3 Edge Cases

| Case | Current Behavior | Status |
|------|-----------------|--------|
| **Empty Chapter** (0 items) | Returns 0% | ✅ Handled |
| **Only Topics** (no subtopics/definitions) | `visitedTopics / totalTopics × 100` | ✅ Works automatically |
| **Single Topic** | 0% → 100% in one visit | ✅ Expected behavior |
| **Division by Zero** | Guarded with `if (totalItems > 0)` | ✅ Protected |
| **Manual Override** | Takes precedence over auto | ✅ Implemented |

### 2.4 Data Structure

```javascript
chapterProgress = {
    progress: 0-100,                    // Final progress (manual or auto)
    isCompleted: boolean,               // true if progress === 100
    isManualOverride: boolean,           // true if user manually set
    manualProgress: number | null,      // User-set value (if manual)
    autoCalculatedProgress: number,      // Auto-calculated value
    visitedItems: {
        chapter: boolean,               // Chapter page visited
        topics: [ObjectId],              // Array of visited topic IDs
        subtopics: [ObjectId],          // Array of visited subtopic IDs
        definitions: [ObjectId]          // Array of visited definition IDs
    },
    congratulationsShown: boolean        // Modal shown flag
}
```

---

## 3. Unit Progress Calculation

### 3.1 Formula

```javascript
// Get ALL chapters in unit (including those with 0% progress)
allChapters = await Chapter.find({ unitId, status: "active" })

// Sum progress for all chapters (0% for chapters without progress data)
totalChapterProgress = allChapters.reduce((sum, chapter) => {
    chapterProgress = studentProgress.progress.get(chapter._id)
    return sum + (chapterProgress?.progress || 0)
}, 0)

// Calculate average
unitProgress = Math.round(totalChapterProgress / allChapters.length)
```

### 3.2 Implementation Details

**Location:**
- `app/api/student/progress/track-visit/route.js` (lines 179-217)
- `app/(main)/hooks/useProgress.js` (lines 182-191)

**Key Points:**
- ✅ Includes ALL chapters (even 0% progress)
- ✅ Uses final chapter progress (manual or auto)
- ✅ Automatically recalculated when any chapter updates
- ✅ Stored in `unitProgress` field in database

### 3.3 Calculation Triggers

Unit progress is recalculated when:
1. Student visits any content in any chapter
2. Student manually adjusts chapter progress
3. Chapter progress is updated via API

### 3.4 Example

**Unit with 4 chapters:**
- Chapter 1: 80% (manual override)
- Chapter 2: 60% (auto-calculated)
- Chapter 3: 0% (not started)
- Chapter 4: 0% (not started)

**Calculation:**
```
unitProgress = (80 + 60 + 0 + 0) / 4 = 35%
```

---

## 4. Subject Progress Calculation

### 4.1 Formula

```javascript
// Fetch progress for all units
unitProgressPromises = unitIds.map(async (unitId) => {
    const response = await fetch(`/api/student/progress?unitId=${unitId}`)
    const progressDoc = response.data[0]
    return progressDoc.unitProgress || 0
})

unitProgresses = await Promise.all(unitProgressPromises)

// Calculate average
totalProgress = unitProgresses.reduce((sum, p) => sum + p, 0)
subjectProgress = Math.round(totalProgress / unitIds.length)
```

### 4.2 Implementation Details

**Location:**
- `app/(main)/components/SubjectProgressClient.jsx` (lines 41-170)

**Key Points:**
- ✅ Calculated **client-side only** (not stored in database)
- ✅ Includes ALL units (even 0% progress)
- ✅ Fetches `unitProgress` from database for each unit
- ✅ Recalculated on component mount and progress updates

### 4.3 Calculation Triggers

Subject progress is recalculated when:
1. Component mounts
2. Any unit progress changes (via events)
3. Polling interval (every 3-5 seconds)
4. Storage events (cross-tab updates)

### 4.4 Example

**Subject with 4 units:**
- Unit 1: 80%
- Unit 2: 60%
- Unit 3: 0%
- Unit 4: 0%

**Calculation:**
```
subjectProgress = (80 + 60 + 0 + 0) / 4 = 35%
```

---

## 5. Data Flow Architecture

### 5.1 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    STUDENT ACTION                           │
│  (Visits Topic/Subtopic/Definition OR Adjusts Slider)      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              ProgressTracker.jsx (Client)                  │
│  - Tracks visit                                            │
│  - Dispatches 'progress-updated' event                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         POST /api/student/progress/track-visit             │
│  - Updates visitedItems array                              │
│  - Calculates autoCalculatedProgress                        │
│  - Applies manual override if exists                       │
│  - Updates chapterProgress                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Recalculate Unit Progress                      │
│  - Fetches ALL chapters in unit                            │
│  - Sums chapter progress                                    │
│  - Calculates average                                       │
│  - Updates unitProgress in DB                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Save to Database                               │
│  - StudentProgress document updated                         │
│  - Chapter progress in Map                                  │
│  - Unit progress field                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Update localStorage (Cache)                     │
│  - Fast UI updates                                          │
│  - Offline support                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Dispatch Events                                │
│  - 'progress-updated' event                                 │
│  - 'chapterProgressUpdate' event                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Client Components Update                        │
│  - ChapterProgressItem (shows new progress)                 │
│  - UnitProgressClient (recalculates unit progress)          │
│  - SubjectProgressClient (recalculates subject progress)     │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Manual Override Flow

```
User Adjusts Slider
        │
        ▼
ChapterProgressItem.handleSliderChange()
        │
        ▼
useProgress.updateChapterProgress()
        │
        ▼
- Updates local state
- Saves to localStorage (immediate)
- Debounced save to database (500ms)
        │
        ▼
Recalculate Unit Progress
        │
        ▼
Update Subject Progress (client-side)
```

### 5.3 Event System

**Custom Events:**
1. **`progress-updated`**
   - Dispatched when progress changes
   - Contains: `{ unitId, unitProgress, chapterProgress }`
   - Listeners: UnitProgressClient, SubjectProgressClient

2. **`chapterProgressUpdate`**
   - Dispatched when chapter progress updates
   - No payload (triggers recalculation)
   - Listeners: All progress components

---

## 6. Storage Strategy

### 6.1 Database Storage (MongoDB)

**Collection:** `StudentProgress`

**Schema:**
```javascript
{
    studentId: ObjectId,
    unitId: ObjectId,
    progress: Map {  // Chapter-level progress
        [chapterId]: {
            progress: Number (0-100),
            isCompleted: Boolean,
            isManualOverride: Boolean,
            manualProgress: Number | null,
            autoCalculatedProgress: Number,
            visitedItems: {
                chapter: Boolean,
                topics: [ObjectId],
                subtopics: [ObjectId],
                definitions: [ObjectId]
            },
            congratulationsShown: Boolean
        }
    },
    unitProgress: Number (0-100),  // Calculated from chapters
    unitCongratulationsShown: Boolean,
    timestamps: { createdAt, updatedAt }
}
```

**Indexes:**
- `{ studentId: 1, unitId: 1 }` (unique compound index)

### 6.2 localStorage Storage (Client Cache)

**Key Format:** `unit-progress-{unitId}`

**Structure:**
```javascript
{
    [chapterId]: {
        progress: Number,
        isCompleted: Boolean,
        isManualOverride: Boolean,
        manualProgress: Number | null,
        autoCalculatedProgress: Number,
        visitedItems: { ... }
    },
    _unitProgress: Number  // Cached unit progress (optional)
}
```

**Purpose:**
- Fast UI updates (no API delay)
- Offline support
- Cross-tab synchronization

### 6.3 Storage Strategy

**Database-First with localStorage Cache:**
1. On load: Fetch from database → Cache to localStorage
2. On update: Update localStorage immediately → Debounced save to database
3. On sync: Database is source of truth, localStorage is cache

---

## 7. Edge Cases & Handling

### 7.1 Empty Chapter

**Scenario:** Chapter has 0 topics, 0 subtopics, 0 definitions

**Current Behavior:**
```javascript
if (totalItems === 0) {
    autoCalculatedProgress = 0
}
```

**Status:** ✅ Handled correctly

**Recommendation:** Consider UI improvement:
- Hide progress bar
- Show "No content in this chapter" message
- Flag: `isEmptyChapter = totalItems === 0`

### 7.2 Chapter with Only Topics

**Scenario:** Chapter has topics but no subtopics/definitions

**Current Behavior:**
```javascript
// Automatically works:
totalItems = totalTopics + 0 + 0 = totalTopics
visitedItems = visitedTopics + 0 + 0 = visitedTopics
progress = (visitedTopics / totalTopics) × 100
```

**Status:** ✅ Works automatically

### 7.3 Single Topic Chapter

**Scenario:** Chapter has exactly 1 topic, no subtopics/definitions

**Current Behavior:**
- Progress: 0% → 100% in single visit
- This is expected and acceptable

**Status:** ✅ Expected behavior

**Optional Enhancement:** Auto-mark as done when visiting the only topic

### 7.4 Division by Zero Protection

**Current Implementation:**
```javascript
if (totalItems > 0) {
    autoCalculatedProgress = Math.round((visitedItems / totalItems) * 100)
} else {
    autoCalculatedProgress = 0
}
```

**Status:** ✅ Protected in all calculation functions

### 7.5 Manual Override Edge Cases

**Scenario 1:** User sets manual progress, then visits more content

**Current Behavior:**
- Auto-calculated progress updates
- Manual progress remains (takes precedence)
- User can see both values

**Status:** ✅ Working as intended

**Scenario 2:** User removes manual override

**Current Behavior:**
- `isManualOverride = false`
- Falls back to `autoCalculatedProgress`

**Status:** ✅ Implemented

### 7.6 Unit with No Chapters

**Scenario:** Unit has 0 active chapters

**Current Behavior:**
```javascript
if (totalChapters === 0) {
    unitProgress = 0
}
```

**Status:** ✅ Handled

### 7.7 Subject with No Units

**Scenario:** Subject has 0 units

**Current Behavior:**
```javascript
if (unitIds.length === 0) {
    setProgress(0)
    return
}
```

**Status:** ✅ Handled

---

## 8. Current Implementation Analysis

### 8.1 Chapter Progress Implementation

**Files:**
- `app/api/student/progress/track-visit/route.js`
- `app/api/student/progress/calculate/route.js`
- `app/(main)/hooks/useProgress.js`

**Strengths:**
- ✅ Division by zero protection
- ✅ Manual override support
- ✅ Auto-calculation from visits
- ✅ Both values stored (manual and auto)

**Differences Between Files:**

| Aspect | track-visit | calculate | useProgress |
|--------|-------------|-----------|-------------|
| **Chapter Visit Count** | ✅ Counts as 1 | ❌ Not counted | ❌ Not counted |
| **Total Items** | `chapter + topics + subtopics + definitions` | `topics + subtopics + definitions` | N/A |
| **Division Guard** | ✅ `if (totalItems > 0)` | ✅ `if (totalItems === 0) return 0` | N/A |

**Issue:** Inconsistent counting of chapter visit between endpoints.

### 8.2 Unit Progress Implementation

**Files:**
- `app/api/student/progress/track-visit/route.js` (lines 179-217)
- `app/(main)/hooks/useProgress.js` (lines 182-191)

**API Implementation (track-visit):**
```javascript
// ✅ Uses ALL chapters from database
const allChapters = await Chapter.find({ unitId, status: "active" })
const totalChapters = allChapters.length
// Sums progress for all chapters (0% for missing)
const unitProgress = Math.round(totalChapterProgress / totalChapters)
```

**Hook Implementation (useProgress):**
```javascript
// ⚠️ Uses only chapters with progress data
const chapterKeys = Object.keys(progressData).filter(key => !key.startsWith('_'))
const avgProgress = Math.round(totalProgress / chapterKeys.length)
```

**Issue:** Inconsistent calculation - API uses all chapters, hook uses only chapters with data.

### 8.3 Subject Progress Implementation

**File:** `app/(main)/components/SubjectProgressClient.jsx`

**Implementation:**
- ✅ Calculated client-side
- ✅ Fetches unit progress from database
- ✅ Includes all units (even 0%)
- ❌ Not stored in database

**Issue:** Subject progress recalculated on every render/poll, not persisted.

---

## 9. Issues & Inconsistencies

### 9.1 Critical Issues

#### Issue 1: Inconsistent Chapter Visit Counting
**Location:** Multiple files  
**Severity:** High

**Problem:**
- `track-visit` route counts chapter visit as 1 item
- `calculate` route does NOT count chapter visit
- Results in different progress values depending on which endpoint is used

**Impact:**
- Progress can be 1-2% different between endpoints
- Confusing for users

**Recommendation:**
- Standardize: Decide if chapter visit should count
- If yes: Update `calculate` route to include chapter
- If no: Remove chapter from `track-visit` route

#### Issue 2: Unit Progress Calculation Inconsistency
**Location:** API vs Hook  
**Severity:** Critical

**Problem:**
- API calculates using ALL chapters from database
- Hook calculates using only chapters with progress data
- Results in different unit progress values

**Example:**
- Unit has 4 chapters, but only 2 have progress data
- API: `(80 + 60 + 0 + 0) / 4 = 35%`
- Hook: `(80 + 60) / 2 = 70%`

**Impact:**
- Unit progress shows different values in different places
- User confusion

**Recommendation:**
- Make hook use all chapters (fetch from database or pass chapter list)
- Ensure consistent calculation everywhere

#### Issue 3: Subject Progress Not Persisted
**Location:** SubjectProgressClient.jsx  
**Severity:** Medium

**Problem:**
- Subject progress calculated client-side only
- Not stored in database
- Recalculated on every render/poll

**Impact:**
- Performance overhead (multiple API calls)
- Potential inconsistency if units load at different times
- No historical tracking

**Recommendation:**
- Consider storing subject progress in database
- Or implement proper caching mechanism

### 9.2 Medium Priority Issues

#### Issue 4: No Empty Chapter UI Handling
**Location:** All components  
**Severity:** Medium

**Problem:**
- Empty chapters show 0% progress
- No indication that chapter has no content
- Confusing for users

**Recommendation:**
- Add `isEmptyChapter` flag
- Hide progress bar for empty chapters
- Show "No content" message

#### Issue 5: Single Topic Chapter Behavior
**Location:** Progress calculation  
**Severity:** Low

**Current:** 0% → 100% in one visit (expected)

**Optional Enhancement:**
- Auto-mark as done when visiting the only topic
- Or show special message for small chapters

### 9.3 Code Quality Issues

#### Issue 6: Duplicate Calculation Logic
**Location:** Multiple files  
**Severity:** Medium

**Problem:**
- Unit progress calculation duplicated in API and hook
- Subject progress calculation in component
- Hard to maintain

**Recommendation:**
- Extract to shared service/utility functions
- Single source of truth for calculations

---

## 10. Recommendations

### 10.1 Immediate Actions (Critical)

1. **Standardize Chapter Visit Counting**
   - Decision: Should chapter visit count as 1 item?
   - Update all endpoints to match decision
   - Document the decision

2. **Fix Unit Progress Inconsistency**
   - Make hook use all chapters (not just those with data)
   - Ensure API and hook use same calculation
   - Add unit tests to verify consistency

3. **Add Division by Zero Guards**
   - Verify all calculation functions have guards
   - Add tests for edge cases

### 10.2 Short-term Improvements (High Priority)

1. **Standardize Calculation Functions**
   - Create shared utility functions:
     - `calculateChapterProgress()`
     - `calculateUnitProgress()`
     - `calculateSubjectProgress()`
   - Use in all places (API, hooks, components)

2. **Improve Empty Chapter Handling**
   - Add `isEmptyChapter` flag
   - Update UI to show appropriate message
   - Hide progress bar for empty chapters

3. **Consider Subject Progress Storage**
   - Evaluate: Store in DB vs. calculate client-side
   - If storing: Add to database schema
   - If calculating: Improve caching mechanism

### 10.3 Long-term Enhancements (Medium Priority)

1. **Add Progress Weighting**
   - Consider: Should some chapters/units count more?
   - Implement weighted averages if needed
   - Add `weightage` field to models

2. **Improve Performance**
   - Reduce polling frequency
   - Implement proper caching
   - Batch API calls where possible

3. **Add Comprehensive Testing**
   - Unit tests for calculation functions
   - Integration tests for API endpoints
   - Edge case testing

4. **Add TypeScript Types**
   - Define interfaces for progress data structures
   - Add type safety to calculations
   - Improve developer experience

---

## 11. Comparison with ChatGPT Approach

### 11.1 What Matches ✅

| Aspect | Current Implementation | ChatGPT Approach | Status |
|--------|----------------------|------------------|--------|
| **Division by Zero** | `if (totalItems > 0)` | `if (totalItems > 0)` | ✅ Match |
| **Manual Override** | `if (isManualOverride)` | `if (isManualOverride)` | ✅ Match |
| **Unit Formula** | `sum(chapters) / total` | `sum(chapters) / total` | ✅ Match |
| **Subject Formula** | `sum(units) / total` | `sum(units) / total` | ✅ Match |
| **Empty Chapter** | Returns 0% | Returns 0% | ✅ Match |
| **Only Topics** | Works automatically | Works automatically | ✅ Match |

### 11.2 Key Differences ⚠️

| Aspect | Current Implementation | ChatGPT Approach | Impact |
|--------|----------------------|------------------|--------|
| **Chapter Visit** | Counts as 1 item | Not counted | Different totals |
| **Unit Calculation** | Inconsistent (API vs Hook) | Single source | Inconsistency |
| **Subject Storage** | Client-side only | Not specified | Performance concern |
| **Empty Chapter UI** | Shows 0% | Hide progress bar | UX difference |

### 11.3 ChatGPT Recommendations to Consider

1. **Empty Chapter Handling**
   - ✅ Good idea: Hide progress bar, show "No content" message
   - Implementation: Add `isEmptyChapter` flag

2. **Single Source of Truth**
   - ✅ Good idea: Standardize calculation functions
   - Implementation: Extract to shared utilities

3. **Type Safety**
   - ✅ Good idea: Add TypeScript types
   - Implementation: Define interfaces for all progress structures

### 11.4 What ChatGPT Missed

1. **Chapter Visit Counting**
   - Current system counts chapter visit
   - ChatGPT didn't mention this
   - Need to decide: Keep or remove?

2. **Real-time Updates**
   - Current system has event-driven updates
   - ChatGPT didn't cover event system
   - This is important for UX

3. **localStorage Caching**
   - Current system uses localStorage for performance
   - ChatGPT didn't mention caching strategy
   - Important for offline support

---

## 12. Formula Reference

### 12.1 Chapter Progress

```javascript
// Auto-calculated
totalItems = totalChapter + totalTopics + totalSubtopics + totalDefinitions
visitedItems = visitedChapter + visitedTopics + visitedSubtopics + visitedDefinitions

if (totalItems > 0) {
    autoCalculatedProgress = Math.round((visitedItems / totalItems) * 100)
    autoCalculatedProgress = Math.min(100, Math.max(0, autoCalculatedProgress))
} else {
    autoCalculatedProgress = 0
}

// Final
if (isManualOverride) {
    chapterProgress = manualProgress
} else {
    chapterProgress = autoCalculatedProgress
}
```

### 12.2 Unit Progress

```javascript
allChapters = await Chapter.find({ unitId, status: "active" })
totalChapters = allChapters.length

totalChapterProgress = allChapters.reduce((sum, chapter) => {
    chapterProgress = studentProgress.progress.get(chapter._id)
    return sum + (chapterProgress?.progress || 0)
}, 0)

if (totalChapters > 0) {
    unitProgress = Math.round(totalChapterProgress / totalChapters)
} else {
    unitProgress = 0
}
```

### 12.3 Subject Progress

```javascript
unitProgresses = await Promise.all(
    unitIds.map(async (unitId) => {
        const response = await fetch(`/api/student/progress?unitId=${unitId}`)
        return response.data[0].unitProgress || 0
    })
)

totalProgress = unitProgresses.reduce((sum, p) => sum + p, 0)
subjectProgress = Math.round(totalProgress / unitIds.length)
```

---

## 13. Data Structures Reference

### 13.1 Chapter Progress Object

```typescript
interface ChapterProgress {
    progress: number;                    // 0-100, final progress
    isCompleted: boolean;                // true if progress === 100
    isManualOverride: boolean;           // true if user manually set
    manualProgress: number | null;       // User-set value (if manual)
    autoCalculatedProgress: number;      // Auto-calculated value
    visitedItems: {
        chapter: boolean;                // Chapter page visited
        topics: string[];                 // Array of visited topic IDs
        subtopics: string[];              // Array of visited subtopic IDs
        definitions: string[];            // Array of visited definition IDs
    };
    congratulationsShown: boolean;       // Modal shown flag
}
```

### 13.2 Unit Progress Object

```typescript
interface UnitProgress {
    unitProgress: number;                 // 0-100, calculated from chapters
    unitCongratulationsShown: boolean;   // Modal shown flag
    progress: Map<string, ChapterProgress>; // Chapter-level progress
}
```

### 13.3 Subject Progress Object

```typescript
interface SubjectProgress {
    subjectProgress: number;              // 0-100, calculated from units
    subjectCongratulationsShown: boolean; // Modal shown flag
    units: UnitProgress[];                // Array of unit progress
}
```

---

## 14. API Endpoints Reference

### 14.1 Track Visit

**Endpoint:** `POST /api/student/progress/track-visit`

**Purpose:** Track student visit to content and update progress

**Request:**
```json
{
    "unitId": "string",
    "chapterId": "string",
    "itemType": "topic" | "subtopic" | "definition",
    "itemId": "string"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "chapterId": "string",
        "itemType": "string",
        "itemId": "string",
        "visited": true,
        "chapterProgress": 0-100,
        "autoCalculatedProgress": 0-100,
        "unitProgress": 0-100
    }
}
```

### 14.2 Calculate Progress

**Endpoint:** `POST /api/student/progress/calculate`

**Purpose:** Recalculate chapter and unit progress

**Request:**
```json
{
    "unitId": "string",
    "chapterId": "string"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "chapterId": "string",
        "chapterProgress": 0-100,
        "autoCalculatedProgress": 0-100,
        "unitProgress": 0-100,
        "itemCounts": {
            "totalTopics": number,
            "totalSubtopics": number,
            "totalDefinitions": number,
            "totalItems": number
        }
    }
}
```

### 14.3 Get Progress

**Endpoint:** `GET /api/student/progress?unitId={unitId}`

**Purpose:** Fetch progress for a unit

**Response:**
```json
{
    "success": true,
    "data": [{
        "studentId": "string",
        "unitId": "string",
        "progress": {
            "[chapterId]": ChapterProgress
        },
        "unitProgress": 0-100,
        "unitCongratulationsShown": boolean
    }]
}
```

---

## 15. Testing Scenarios

### 15.1 Chapter Progress Tests

**Test Case 1: Empty Chapter**
- Input: Chapter with 0 topics, 0 subtopics, 0 definitions
- Expected: `autoCalculatedProgress = 0`
- Status: ✅ Should pass

**Test Case 2: Only Topics**
- Input: Chapter with 5 topics, 0 subtopics, 0 definitions, 3 visited
- Expected: `autoCalculatedProgress = (3 / 5) × 100 = 60%`
- Status: ✅ Should pass

**Test Case 3: Manual Override**
- Input: Auto progress = 50%, Manual = 80%, `isManualOverride = true`
- Expected: `chapterProgress = 80%`
- Status: ✅ Should pass

**Test Case 4: Division by Zero**
- Input: `totalItems = 0`
- Expected: `autoCalculatedProgress = 0` (no error)
- Status: ✅ Should pass

### 15.2 Unit Progress Tests

**Test Case 1: All Chapters Have Progress**
- Input: 4 chapters with [80%, 60%, 40%, 20%]
- Expected: `unitProgress = (80 + 60 + 40 + 20) / 4 = 50%`
- Status: ✅ Should pass

**Test Case 2: Some Chapters Missing**
- Input: 4 chapters, but only 2 have progress [80%, 60%]
- Expected: `unitProgress = (80 + 60 + 0 + 0) / 4 = 35%`
- Status: ⚠️ Current hook calculates differently

**Test Case 3: Empty Unit**
- Input: Unit with 0 chapters
- Expected: `unitProgress = 0`
- Status: ✅ Should pass

### 15.3 Subject Progress Tests

**Test Case 1: All Units Have Progress**
- Input: 4 units with [80%, 60%, 40%, 20%]
- Expected: `subjectProgress = (80 + 60 + 40 + 20) / 4 = 50%`
- Status: ✅ Should pass

**Test Case 2: Some Units Missing**
- Input: 4 units, but only 2 have progress [80%, 60%]
- Expected: `subjectProgress = (80 + 60 + 0 + 0) / 4 = 35%`
- Status: ✅ Should pass

---

## 16. Conclusion

### 16.1 Summary

The progress calculation system is **functionally correct** with proper edge case handling and division by zero protection. However, there are **inconsistencies** in implementation that need to be addressed:

1. **Chapter visit counting** differs between endpoints
2. **Unit progress calculation** differs between API and hook
3. **Subject progress** not persisted in database

### 16.2 Priority Actions

1. **Critical:** Fix unit progress inconsistency
2. **High:** Standardize chapter visit counting
3. **Medium:** Consider subject progress storage
4. **Low:** Improve empty chapter UI

### 16.3 System Health

- ✅ Core logic: **Sound**
- ✅ Edge cases: **Handled**
- ⚠️ Consistency: **Needs improvement**
- ⚠️ Performance: **Acceptable, could be better**
- ✅ User experience: **Good, could be enhanced**

---

## Appendix A: Code Locations

### A.1 Chapter Progress

- **API - Track Visit:** `app/api/student/progress/track-visit/route.js` (lines 104-174)
- **API - Calculate:** `app/api/student/progress/calculate/route.js` (lines 52-69)
- **Hook:** `app/(main)/hooks/useProgress.js` (lines 244-302)
- **Component:** `app/(main)/components/ChapterProgressItem.jsx`

### A.2 Unit Progress

- **API:** `app/api/student/progress/track-visit/route.js` (lines 179-217)
- **Hook:** `app/(main)/hooks/useProgress.js` (lines 182-191)
- **Component:** `app/(main)/components/UnitProgressClient.jsx`

### A.3 Subject Progress

- **Component:** `app/(main)/components/SubjectProgressClient.jsx` (lines 41-170)

### A.4 Models

- **StudentProgress:** `models/StudentProgress.js`
- **SubjectProgress:** `models/SubjectProgress.js` (if exists)

---

## Appendix B: Glossary

- **Auto-Calculated Progress:** Progress calculated automatically from content visits
- **Manual Override:** User-set progress that takes precedence over auto-calculated
- **Chapter Progress:** Base level progress for individual chapters
- **Unit Progress:** Aggregated progress from all chapters in a unit
- **Subject Progress:** Aggregated progress from all units in a subject
- **Visited Items:** Array of content items (topics, subtopics, definitions) that student has visited
- **Total Items:** Total count of all content items in a chapter

---

**Report End**

*This report documents the complete progress calculation system. For implementation changes, refer to the recommendations section and coordinate with the development team.*

