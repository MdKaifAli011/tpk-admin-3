# Student Cascading Delete Analysis Report

**Date:** Generated on analysis  
**Status:** Analysis Complete - Implementation Required  
**No Code Changes Made**

---

## Executive Summary

This report analyzes the current state of student deletion and identifies all related data that should be deleted when a student account is removed. Currently, **no student deletion endpoint exists**, and there is **no cascading delete implementation** for student-related data.

---

## Current State

### 1. Student Deletion Endpoint

**Status:** ❌ **DOES NOT EXIST**

- No API endpoint found at `/api/student/[id]/route.js`
- No DELETE method for students in any route file
- Students can only be marked as `inactive` via status field, but not deleted

### 2. Student Model

**Location:** `models/Student.js`

**Schema Fields:**

- `firstName`, `lastName`, `email`, `password`, `phoneNumber`
- `className`, `prepared`, `country`
- `status` (enum: "active", "inactive")
- `lastLogin` (Date)
- `leadId` (ObjectId reference to Lead)

**Current Hooks:**

- ✅ `pre("save")` - Password hashing
- ❌ **NO cascading delete hook**

---

## Related Data Models (Need Cascading Delete)

### 1. StudentProgress

**Location:** `models/StudentProgress.js`  
**Reference:** `studentId` (ObjectId, ref: "Student", required: true, indexed)

**Data Stored:**

- **Unit-level progress:** `unitProgress` (0-100%), `unitCongratulationsShown` (boolean)
- **Chapter-level progress** (stored in `progress` Map):
  - `progress` (0-100%) - Final progress (manual or auto)
  - `isCompleted` (boolean) - Completion status
  - `isManualOverride` (boolean) - Whether manually set
  - `manualProgress` (number | null) - User-set value (if manual)
  - `autoCalculatedProgress` (number) - Auto-calculated from visits
  - `visitedItems` (object):
    - `chapter` (boolean) - Chapter page visited
    - `topics` (Array of ObjectId) - Visited topic IDs
    - `subtopics` (Array of ObjectId) - Visited subtopic IDs
    - `definitions` (Array of ObjectId) - Visited definition IDs
  - `congratulationsShown` (boolean) - Modal shown flag

**Impact:** All progress data for the student should be deleted

**Indexes:**

- `{ studentId: 1, unitId: 1 }` (unique compound) - Ensures one progress document per student per unit
- `{ studentId: 1 }` - Fast lookup of all progress for a student
- `{ unitId: 1 }` - Fast lookup of all students' progress for a unit

---

### 2. SubjectProgress

**Location:** `models/SubjectProgress.js`  
**Reference:** `studentId` (ObjectId, ref: "Student", required: true, indexed)

**Data Stored:**

- `subjectProgress` (0-100%) - Subject completion percentage
- `subjectCongratulationsShown` (boolean) - Whether congratulations modal was shown
- `createdAt`, `updatedAt` (timestamps)

**Impact:** All subject progress data for the student should be deleted

**Indexes:**

- `{ studentId: 1, subjectId: 1 }` (unique compound) - Ensures one progress document per student per subject
- `{ studentId: 1 }` - Fast lookup of all subject progress for a student
- `{ subjectId: 1 }` - Fast lookup of all students' progress for a subject

---

### 3. StudentTestResult (Practice Test Results)

**Location:** `models/StudentTestResult.js`  
**Reference:** `studentId` (ObjectId, ref: "Student", required: true, indexed)

**Test System Structure:**

- **PracticeCategory** → Top-level test category (linked to Exam)
- **PracticeSubCategory** → Individual test/practice paper (linked to PracticeCategory)
- **PracticeQuestion** → Test questions (linked to PracticeSubCategory)
- **StudentTestResult** → Student's test attempt results (linked to PracticeSubCategory via `testId`)

**Data Stored in StudentTestResult:**

1. **Test Identification:**

   - `testId` (ObjectId, ref: "PracticeSubCategory") - The test/practice paper taken
   - Hierarchical references: `examId`, `subjectId`, `unitId`, `chapterId`, `topicId`, `subTopicId`

2. **Test Performance Metrics:**

   - `totalQuestions` - Total number of questions in test
   - `correctCount` - Number of correct answers
   - `incorrectCount` - Number of incorrect answers
   - `unansweredCount` - Number of unanswered questions
   - `totalMarks` - Marks obtained by student
   - `maximumMarks` - Maximum possible marks
   - `percentage` - Percentage score (0-100)
   - `timeTaken` - Time taken in seconds

3. **Detailed Answer Data:**

   - `answers` (Map) - QuestionId → Answer (A, B, C, D) mapping
   - `questionResults` (Array) - Detailed per-question results:
     - `questionId` (ref: "PracticeQuestion")
     - `question` (String) - Question text
     - `userAnswer` (A, B, C, D) - Student's answer
     - `correctAnswer` (A, B, C, D) - Correct answer
     - `isCorrect` (Boolean) - Whether answer was correct
     - `marks` (Number) - Marks obtained for this question

4. **Test Metadata:**
   - `startedAt` (Date) - When test was started
   - `submittedAt` (Date) - When test was submitted
   - `createdAt`, `updatedAt` (timestamps)

**Test Result Behavior:**

- **Upsert Logic:** If student retakes same test, existing result is updated (not duplicated)
- **One Result Per Test:** Each student can have only one result per testId (updated on retake)
- **Multiple Tests:** Student can have results for multiple different tests

**Impact:** All test results for the student should be deleted

**What Gets Deleted:**

- All StudentTestResult documents where `studentId` matches
- This includes all test attempts, scores, answers, and question-wise results
- Historical performance data across all practice tests

**What Does NOT Get Deleted:**

- PracticeCategory, PracticeSubCategory, PracticeQuestion - These are content/templates, not student data
- Test questions and test structure remain intact

**Indexes:**

- `{ studentId: 1, testId: 1 }` - Find result for specific test
- `{ studentId: 1, submittedAt: -1 }` - Get recent test results
- `{ testId: 1 }` - Find all students who took a test
- `{ studentId: 1, examId: 1 }` - Get all test results for exam
- `{ studentId: 1, subjectId: 1 }` - Get all test results for subject
- `{ studentId: 1, testId: 1, percentage: -1 }` (compound) - Get best score per test

---

### 4. Lead (Reverse Relationship)

**Location:** `models/Lead.js`  
**Relationship:** Student has `leadId` field pointing to Lead

**Note:**

- Lead does NOT have `studentId` field
- Student has `leadId` field (optional)
- When student is deleted, the Lead should **NOT** be deleted automatically
- However, if Lead is deleted, student's `leadId` should be set to `null`

**✅ DECISION MADE:** **Keep Lead data** - Lead will NOT be deleted when student is deleted

- Lead represents marketing/sales data
- Needed for analytics and reporting
- Student deletion is account management, not marketing data cleanup
- Lead data persists independently

---

## Implementation Requirements

### 1. Create Student Delete Endpoint

**Location:** `app/api/student/[id]/route.js` (NEW FILE)

**Required:**

- DELETE method
- Authentication check (admin only)
- Validation (ObjectId check)
- Cascading delete logic
- Error handling

---

### 2. Add Cascading Delete Hook to Student Model

**Location:** `models/Student.js`

**Hook Type:** `pre("findOneAndDelete")` or `pre("findByIdAndDelete")`

**Similar Pattern:** See `models/Subject.js` (lines 70-195) for reference implementation

**Required Actions:**

1. **Delete all `StudentProgress` documents** where `studentId` matches

   - **Deletes:**
     - All unit-level progress documents (1 per unit accessed)
     - All chapter-level progress data (stored in Map within each unit progress)
     - All visited items (topics, subtopics, definitions)
     - All completion statuses
     - All congratulations shown flags (chapter and unit level)
     - All manual progress overrides
     - All auto-calculated progress values
   - **Query:** `StudentProgress.deleteMany({ studentId: studentId })`

2. **Delete all `SubjectProgress` documents** where `studentId` matches

   - **Deletes:**
     - All subject-level progress documents (1 per subject accessed)
     - Subject completion percentages
     - Subject congratulations shown flags
   - **Query:** `SubjectProgress.deleteMany({ studentId: studentId })`

3. **Delete all `StudentTestResult` documents** where `studentId` matches

   - **Deletes:**
     - All practice test result documents (1 per unique test taken)
     - All test scores (totalMarks, maximumMarks, percentage)
     - All answer data (answers Map: questionId → answer)
     - All question-wise results (questionResults array with per-question details)
     - All test metadata (timeTaken, startedAt, submittedAt)
     - All hierarchical references (examId, subjectId, unitId, chapterId, topicId, subTopicId)
   - **Note:** Test content templates (PracticeCategory, PracticeSubCategory, PracticeQuestion) are **NOT deleted** - these are content, not student data
   - **Query:** `StudentTestResult.deleteMany({ studentId: studentId })`

4. **✅ Keep Lead data** - Do NOT delete Lead (decision confirmed)
   - Lead data persists independently for marketing/analytics
   - No action needed (one-way relationship: Student → Lead)

---

### 3. Delete Order (Important for Data Integrity)

**Recommended Order:**

1. **Delete `StudentTestResult`** (most specific, no dependencies)

   - **Why first:** Test results are independent, no dependencies on progress data
   - **Deletes:** All practice test results, scores, answers, and question-wise results
   - **Query:** `StudentTestResult.deleteMany({ studentId: studentId })`
   - **Expected count:** Multiple (1 per unique test taken by student)

2. **Delete `SubjectProgress`** (depends on student only)

   - **Why second:** Subject progress is independent of unit/chapter progress
   - **Deletes:** Subject-level progress tracking
   - **Query:** `SubjectProgress.deleteMany({ studentId: studentId })`
   - **Expected count:** Multiple (1 per subject student has accessed)

3. **Delete `StudentProgress`** (depends on student only)

   - **Why third:** Unit/chapter progress is independent of test results and subject progress
   - **Deletes:**
     - Unit-level progress documents
     - Chapter-level progress (stored in Map)
     - Visited items, completion status, congratulations flags
   - **Query:** `StudentProgress.deleteMany({ studentId: studentId })`
   - **Expected count:** Multiple (1 per unit student has accessed)

4. **Skip Lead** - Keep Lead data (no action needed)

   - **Why skip:** Lead represents marketing/sales data, should persist
   - Lead data persists independently
   - No cleanup needed (one-way relationship: Student → Lead)

5. **Delete `Student` document** (final step)
   - **Why last:** Delete parent document only after all child documents are removed
   - **Deletes:** Student account, profile, authentication data
   - **Query:** `Student.findByIdAndDelete(studentId)` or `Student.findOneAndDelete({ _id: studentId })`

**Reason:** Delete child documents first, then parent. This ensures referential integrity and prevents orphaned records. Lead is independent and should persist for marketing/analytics purposes.

---

## Code Structure Reference

### Example: Subject Cascading Delete

**Location:** `models/Subject.js` (lines 70-195)

```javascript
// Example from models/Subject.js (lines 70-195)
subjectSchema.pre("findOneAndDelete", async function () {
  try {
    const subject = await this.model.findOne(this.getQuery());
    if (subject) {
      console.log(
        `🗑️ Cascading delete: Deleting all entities for subject ${subject._id}`
      );

      // Get all related models (dynamic import for hot-reload support)
      const Unit = mongoose.models.Unit || (await import("./Unit.js")).default;
      const Chapter =
        mongoose.models.Chapter || (await import("./Chapter.js")).default;
      // ... more models

      // Delete related data in order
      await SubjectDetails.deleteMany({ subjectId: subject._id });
      // ... more deletions

      console.log(`✅ Cascading delete completed for subject ${subject._id}`);
    }
  } catch (error) {
    console.error("❌ Error in cascading delete:", error);
    throw error; // Prevent deletion if cascading fails
  }
});

// Similar pattern for Student model:
studentSchema.pre("findOneAndDelete", async function () {
  try {
    const student = await this.model.findOne(this.getQuery());
    if (student) {
      console.log(
        `🗑️ Cascading delete: Deleting all data for student ${student._id}`
      );

      // Get all related models
      const StudentProgress =
        mongoose.models.StudentProgress ||
        (await import("./StudentProgress.js")).default;
      const SubjectProgress =
        mongoose.models.SubjectProgress ||
        (await import("./SubjectProgress.js")).default;
      const StudentTestResult =
        mongoose.models.StudentTestResult ||
        (await import("./StudentTestResult.js")).default;

      // Delete in order (child documents first)
      const testResultsResult = await StudentTestResult.deleteMany({
        studentId: student._id,
      });
      console.log(`🗑️ Deleted ${testResultsResult.deletedCount} test results`);

      const subjectProgressResult = await SubjectProgress.deleteMany({
        studentId: student._id,
      });
      console.log(
        `🗑️ Deleted ${subjectProgressResult.deletedCount} subject progress records`
      );

      const studentProgressResult = await StudentProgress.deleteMany({
        studentId: student._id,
      });
      console.log(
        `🗑️ Deleted ${studentProgressResult.deletedCount} student progress records`
      );

      // Note: Lead is NOT deleted (marketing data persists)

      console.log(`✅ Cascading delete completed for student ${student._id}`);
    }
  } catch (error) {
    console.error("❌ Error in cascading delete:", error);
    throw error; // Prevent deletion if cascading fails
  }
});
```

---

## Implementation Checklist

### Phase 1: Student Delete Endpoint

- [ ] Create `app/api/student/[id]/route.js`
- [ ] Implement DELETE method
- [ ] Add authentication middleware (admin only)
- [ ] Add validation (ObjectId check)
- [ ] Add error handling
- [ ] Test endpoint

### Phase 2: Cascading Delete Hook

- [ ] Add `pre("findOneAndDelete")` hook to Student model (`models/Student.js`)
- [ ] Import required models (use dynamic import for hot-reload support):
  - `StudentProgress` - `mongoose.models.StudentProgress || (await import("./StudentProgress.js")).default`
  - `SubjectProgress` - `mongoose.models.SubjectProgress || (await import("./SubjectProgress.js")).default`
  - `StudentTestResult` - `mongoose.models.StudentTestResult || (await import("./StudentTestResult.js")).default`
- [ ] Implement deletion logic in correct order:
  1. Delete `StudentTestResult.deleteMany({ studentId: student._id })`
  2. Delete `SubjectProgress.deleteMany({ studentId: student._id })`
  3. Delete `StudentProgress.deleteMany({ studentId: student._id })`
  4. **Skip Lead** - No action needed (Lead data persists)
- [ ] Add comprehensive error handling:
  - Try-catch block around all deletions
  - Log deletion counts for each model
  - Throw error if cascading fails (prevents student deletion)
- [ ] Add logging:
  - Log start of cascading delete
  - Log deletion count for each model
  - Log completion or error
- [ ] Test cascading delete with various data combinations

### Phase 3: Testing

- [ ] Test deleting student with progress data:
  - Student with multiple units of progress
  - Student with chapter-level visited items
  - Verify StudentProgress deleted
- [ ] Test deleting student with test results:
  - Student with multiple practice test results
  - Student with test scores, answers, question results
  - Verify StudentTestResult deleted
  - Verify test content (PracticeCategory, etc.) **NOT deleted**
- [ ] Test deleting student with subject progress:
  - Student with subject-level progress
  - Verify SubjectProgress deleted
- [ ] Test deleting student with leadId:
  - Student with linked Lead
  - Verify Lead **NOT deleted** (persists)
- [ ] Test deleting student with all data types:
  - Student with progress + test results + subject progress + lead
  - Verify all student data deleted, Lead and test content kept
- [ ] Verify all related data is deleted:
  - Query database to confirm no orphaned records
- [ ] Test error scenarios:
  - Invalid student ID
  - Non-existent student
  - Database connection errors

### Phase 4: Admin UI (Optional)

- [ ] Add delete button in student management UI
- [ ] Add confirmation dialog
- [ ] Show success/error messages
- [ ] Refresh student list after deletion

---

## Data Deletion Summary

When a student is deleted, the following data will be removed:

| Model                 | Count Estimate               | Data Type                                           | Details                                                               |
| --------------------- | ---------------------------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| **StudentProgress**   | Multiple (1 per unit)        | Progress tracking, visited items, completion status | Unit progress, chapter progress, visited topics/subtopics/definitions |
| **SubjectProgress**   | Multiple (1 per subject)     | Subject-level progress                              | Subject completion percentage, congratulations shown                  |
| **StudentTestResult** | Multiple (1 per unique test) | Test scores, answers, results                       | Practice test results, scores, answers map, question-wise results     |
| **Student**           | 1                            | Student account                                     | Student profile, authentication data                                  |
| **Lead**              | 0 (✅ KEPT)                  | Marketing lead data - **NOT DELETED**               | Lead information persists for analytics                               |
| **Test Content**      | 0 (✅ KEPT)                  | Practice test templates - **NOT DELETED**           | PracticeCategory, PracticeSubCategory, PracticeQuestion remain intact |

---

## Decision Points

### 1. Lead Deletion Strategy

**✅ DECISION CONFIRMED:** **Keep Lead data** - Lead will NOT be deleted

**Rationale:**

- Lead represents marketing/sales data
- Needed for analytics and reporting
- Student deletion is account management, not marketing data cleanup
- Lead data persists independently
- No action needed on Lead when student is deleted (one-way relationship)

---

### 2. Soft Delete vs Hard Delete

**Question:** Should we implement soft delete (status: "inactive") or hard delete?

**Current State:** Only soft delete exists (status field)

**Recommendation:**

- **Hard Delete:** For GDPR compliance and data cleanup
- **Soft Delete:** Keep for audit trail (optional)

**Implementation:** Can support both - soft delete by default, hard delete via admin action

---

### 3. Error Handling Strategy

**Question:** What happens if cascading delete fails?

**Recommendation:**

- **Option A: Use MongoDB Transaction (Recommended if available)**

  - Wrap all deletions in a transaction
  - If any deletion fails, rollback all changes
  - Ensures atomicity (all or nothing)
  - Requires MongoDB replica set

- **Option B: Sequential Deletion with Error Handling (Fallback)**

  - Delete in order, stop on first error
  - Throw error to prevent student deletion if cascading fails
  - Log all errors with details
  - Return detailed error message to admin
  - Admin can retry after fixing issues

- **Error Logging:**

  - Log which model deletion failed
  - Log deletion counts before failure
  - Log error message and stack trace
  - Store in error log for debugging

- **User Feedback:**
  - Return clear error message to admin
  - Indicate which part of deletion failed
  - Suggest next steps (check logs, retry, contact support)

---

## Security Considerations

1. **Authentication:** Only admins can delete students

   - Use `requireUserManagement` or similar admin-only middleware
   - Verify admin token/role before allowing deletion

2. **Authorization:** Verify admin role before deletion

   - Check user role/permissions
   - Ensure user has "DELETE" permission for students

3. **Validation:** Validate ObjectId format

   - Check `mongoose.Types.ObjectId.isValid(id)`
   - Return error if invalid format
   - Prevent NoSQL injection attacks

4. **Audit Log:** Consider logging student deletions

   - Log: Who deleted (admin user ID/email)
   - Log: When deleted (timestamp)
   - Log: Which student (student ID/email)
   - Log: Why deleted (optional reason)
   - Store in separate audit collection or log file

5. **Confirmation:** Require explicit confirmation in UI

   - Show confirmation dialog with student details
   - Warn about data that will be deleted
   - Require typing student email or "DELETE" to confirm
   - Prevent accidental deletions

6. **Rate Limiting:** Consider rate limiting for delete operations
   - Prevent abuse/mass deletions
   - Limit deletions per admin per time period

---

## Performance Considerations

1. **Bulk Deletes:** Use `deleteMany()` for related data (efficient)

   - Single query per model type
   - Much faster than deleting one-by-one
   - Returns deletion count for verification

2. **Indexes:** All related models have indexes on `studentId` (fast queries)

   - StudentProgress: `{ studentId: 1 }` index
   - SubjectProgress: `{ studentId: 1 }` index
   - StudentTestResult: `{ studentId: 1 }` index
   - Queries will be fast even with large datasets

3. **Transaction:** Consider using MongoDB transactions for atomicity

   - If one deletion fails, rollback all deletions
   - Ensures data consistency
   - Requires MongoDB replica set (not available in standalone)

4. **Async Operations:** Deletions can run sequentially or in parallel

   - **Sequential (recommended):** Delete in order, easier error handling
   - **Parallel:** Use `Promise.all()` for faster execution, but harder error handling
   - Student deletion must be last (after all child documents)

5. **Deletion Count Verification:**
   - `deleteMany()` returns `{ deletedCount: number }`
   - Log deletion counts for audit trail
   - Verify expected counts match actual counts

---

## Related Files to Modify

1. **NEW:** `app/api/student/[id]/route.js` - Delete endpoint
2. **MODIFY:** `models/Student.js` - Add cascading delete hook
3. **OPTIONAL:** Admin UI component for student management

---

## Testing Scenarios

### Scenario 1: Student with Progress Data

- Student has 5 units of progress
- Student has 3 subjects of progress
- **Expected:** All progress data deleted, student deleted

### Scenario 2: Student with Test Results

- Student has taken 10 different practice tests
- Each test has: scores, answers map, question-wise results, time taken
- **Expected:**
  - All 10 StudentTestResult documents deleted
  - All test scores, answers, and question results deleted
  - Test content (PracticeCategory, PracticeSubCategory, PracticeQuestion) **KEPT**
  - Student deleted

### Scenario 3: Student with Lead

- Student has `leadId` pointing to Lead
- **Expected:** Student deleted, **Lead kept** (Lead data persists)

### Scenario 4: Student with No Related Data

- Student just registered, no activity
- **Expected:** Student deleted successfully

### Scenario 5: Invalid Student ID

- Non-existent or invalid ObjectId
- **Expected:** Error returned, no deletion

---

## Summary of Data to Delete

### ✅ Data That WILL Be Deleted:

1. **StudentProgress**

   - All unit-level progress (1 document per unit student has accessed)
   - All chapter-level progress (stored in Map within each unit progress)
   - All visited items (topics, subtopics, definitions)
   - All completion statuses
   - All congratulations shown flags
   - All manual progress overrides

2. **SubjectProgress**

   - All subject-level progress (1 document per subject student has accessed)
   - Subject completion percentages
   - Subject congratulations shown flags

3. **StudentTestResult**

   - All practice test results (1 document per unique test taken)
   - All test scores (totalMarks, maximumMarks, percentage)
   - All answer data (answers Map: questionId → answer)
   - All question-wise results (questionResults array)
   - All test metadata (timeTaken, startedAt, submittedAt)
   - All hierarchical references (examId, subjectId, unitId, chapterId, topicId, subTopicId)

4. **Student**
   - Student account document
   - Student profile information
   - Authentication data

### ✅ Data That Will NOT Be Deleted:

1. **Lead** - Marketing/sales data persists
2. **PracticeCategory** - Test category templates
3. **PracticeSubCategory** - Test/practice paper templates
4. **PracticeQuestion** - Test question content

---

## Conclusion

**Current State:**

- ❌ No student deletion endpoint
- ❌ No cascading delete implementation
- ✅ Related models identified:
  - StudentProgress (unit/chapter progress)
  - SubjectProgress (subject-level progress)
  - StudentTestResult (practice test results)
- ✅ Indexes exist for efficient deletion
- ✅ Test system structure understood

**Next Steps:**

1. Create student delete endpoint (`app/api/student/[id]/route.js`)
2. Implement cascading delete hook in Student model
3. ✅ **Lead deletion strategy confirmed** - Keep Lead data
4. ✅ **Test content strategy confirmed** - Keep test templates (PracticeCategory, PracticeSubCategory, PracticeQuestion)
5. Delete only student-specific data (progress + test results)
6. Test thoroughly
7. Add admin UI (optional)

**Estimated Implementation Time:** 2-4 hours

**Key Points:**

- ✅ **Only student-specific data is deleted:**

  - StudentProgress (unit/chapter progress, visited items)
  - SubjectProgress (subject-level progress)
  - StudentTestResult (practice test results, scores, answers)
  - Student account (profile, authentication)

- ✅ **Test content and Lead data persist:**

  - PracticeCategory, PracticeSubCategory, PracticeQuestion (test templates)
  - Lead (marketing/sales data)

- ✅ **All progress tracking data is removed:**

  - Unit-level progress
  - Chapter-level progress
  - Subject-level progress
  - Visited items tracking
  - Completion statuses
  - Congratulations flags

- ✅ **All test attempt results are removed:**

  - Test scores and percentages
  - Answer data (answers Map)
  - Question-wise results
  - Test metadata (time taken, dates)

- ✅ **Data integrity maintained:**
  - No orphaned records
  - No broken references
  - Clean database state

---

**Report End**

_This report documents the analysis of student cascading delete requirements. No code changes have been made._
