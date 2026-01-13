# API Endpoints Documentation

Base URL: `/api`

## 📚 Exam Endpoints

### List Exams
- **GET** `/api/exam`
  - Query Parameters:
    - `page` (optional): Page number (default: 1)
    - `limit` (optional): Items per page (default: 10)
    - `status` (optional): Filter by status (`active`, `inactive`, `all`) (default: `active`)
  - Description: Get paginated list of exams with optional status filtering
  - Authentication: Required (all authenticated users can view)
  - Response: Returns exams sorted by `orderNumber` and `createdAt`

### Create Exam
- **POST** `/api/exam`
  - Body: `{ name: string, status?: string, orderNumber?: number }`
  - Description: Create a new exam
  - Authentication: Required (requires action permissions)
  - Notes: Exam name is automatically converted to uppercase

### Get Single Exam
- **GET** `/api/exam/[id]`
  - Description: Get a single exam by ID
  - Authentication: Required (all authenticated users can view)

### Update Exam
- **PUT** `/api/exam/[id]`
  - Body: `{ name: string, status?: string, orderNumber?: number }`
  - Description: Update exam details
  - Authentication: Required (requires action permissions)
  - Notes: Exam name is automatically converted to uppercase

### Update Exam Status/Order (Partial)
- **PATCH** `/api/exam/[id]`
  - Body: `{ status?: string, orderNumber?: number }`
  - Description: Update exam status and/or orderNumber with cascading to all children
  - Authentication: Required (requires action permissions)
  - Notes: Status changes cascade to all subjects, units, chapters, topics, and subtopics

### Get Exam Details (SEO/Content)
- **GET** `/api/exam/[id]/details`
  - Description: Get exam details (content, title, metaDescription, keywords)
  - Authentication: Required (all authenticated users can view)
  - Response: Returns details object or empty defaults if not found

### Create/Update Exam Details
- **PUT** `/api/exam/[id]/details`
  - Body: `{ content?: string, title?: string, metaDescription?: string, keywords?: string }`
  - Description: Create or update exam details (upsert operation)
  - Authentication: Required (requires action permissions)

### Delete Exam Details
- **DELETE** `/api/exam/[id]/details`
  - Description: Delete exam details
  - Authentication: Required (requires action permissions)

### Delete Exam
- **DELETE** `/api/exam/[id]`
  - Description: Delete an exam
  - Authentication: Required (requires action permissions)

---

## 📖 Subject Endpoints

### List Subjects
- **GET** `/api/subject`
  - Query Parameters:
    - `page` (optional): Page number (default: 1)
    - `limit` (optional): Items per page (default: 10)
    - `examId` (optional): Filter by exam ID
    - `status` (optional): Filter by status (`active`, `inactive`, `all`) (default: `active`)
  - Description: Get paginated list of subjects with optional filtering
  - Response: Returns subjects with populated exam data, sorted by `orderNumber` and `createdAt`

### Create Subject
- **POST** `/api/subject`
  - Body: `{ name: string, examId: string, status?: string, orderNumber?: number }`
  - Description: Create a new subject
  - Notes: Subject name is automatically capitalized (first letter of each word). If `orderNumber` is not provided, it's auto-calculated based on existing subjects in the exam.

### Get Single Subject
- **GET** `/api/subject/[id]`
  - Description: Get a single subject by ID with populated exam data

### Update Subject
- **PUT** `/api/subject/[id]`
  - Body: `{ name: string, examId?: string, status?: string, orderNumber?: number }`
  - Description: Update subject details
  - Notes: Subject name is automatically capitalized

### Update Subject Status/Order (Partial)
- **PATCH** `/api/subject/[id]`
  - Body: `{ status?: string, orderNumber?: number }`
  - Description: Update subject status and/or orderNumber

### Get Subject Details (SEO/Content)
- **GET** `/api/subject/[id]/details`
  - Description: Get subject details (content, title, metaDescription, keywords)
  - Response: Returns details object or empty defaults if not found

### Create/Update Subject Details
- **PUT** `/api/subject/[id]/details`
  - Body: `{ content?: string, title?: string, metaDescription?: string, keywords?: string }`
  - Description: Create or update subject details (upsert operation)

### Delete Subject Details
- **DELETE** `/api/subject/[id]/details`
  - Description: Delete subject details

### Update Subject Status with Cascading
- **PATCH** `/api/subject/[id]/status`
  - Body: `{ status: string }` (must be `active` or `inactive`)
  - Description: Update subject status with cascading to all children (units, chapters, topics, subtopics)

### Delete Subject
- **DELETE** `/api/subject/[id]`
  - Description: Delete a subject

---

## 📚 Unit Endpoints

### List Units
- **GET** `/api/unit`
  - Query Parameters:
    - `page` (optional): Page number (default: 1)
    - `limit` (optional): Items per page (default: 10)
    - `subjectId` (optional): Filter by subject ID
    - `examId` (optional): Filter by exam ID
    - `status` (optional): Filter by status (`active`, `inactive`, `all`) (default: `active`)
  - Description: Get paginated list of units with optional filtering
  - Response: Returns units with populated subject and exam data, sorted by `orderNumber`

### Create Unit
- **POST** `/api/unit`
  - Body: `{ name: string, subjectId: string, examId: string, status?: string, orderNumber?: number }`
  - Description: Create a new unit
  - Notes: Unit name is automatically capitalized. If `orderNumber` is not provided, it's auto-calculated.

### Get Single Unit
- **GET** `/api/unit/[id]`
  - Description: Get a single unit by ID with populated subject and exam data

### Update Unit
- **PUT** `/api/unit/[id]`
  - Body: `{ name: string, subjectId?: string, examId?: string, status?: string, orderNumber?: number }`
  - Description: Update unit details
  - Notes: Unit name is automatically capitalized

### Update Unit Status/Order (Partial)
- **PATCH** `/api/unit/[id]`
  - Body: `{ name?: string, subjectId?: string, examId?: string, status?: string, orderNumber?: number }`
  - Description: Update unit fields (partial update supported)

### Get Unit Details (SEO/Content)
- **GET** `/api/unit/[id]/details`
  - Description: Get unit details (content, title, metaDescription, keywords)
  - Response: Returns details object or empty defaults if not found

### Create/Update Unit Details
- **PUT** `/api/unit/[id]/details`
  - Body: `{ content?: string, title?: string, metaDescription?: string, keywords?: string }`
  - Description: Create or update unit details (upsert operation)

### Delete Unit Details
- **DELETE** `/api/unit/[id]/details`
  - Description: Delete unit details

### Reorder Units
- **PATCH** `/api/unit/reorder`
  - Body: `{ units: Array<{ id: string, orderNumber: number }> }`
  - Description: Reorder multiple units at once
  - Notes: All units must belong to the same subject and exam

### Update Unit Status with Cascading
- **PATCH** `/api/unit/[id]/status`
  - Body: `{ status: string }` (must be `active` or `inactive`)
  - Description: Update unit status with cascading to all children (chapters, topics, subtopics)

### Delete Unit
- **DELETE** `/api/unit/[id]`
  - Description: Delete a unit

---

## 📑 Chapter Endpoints

### List Chapters
- **GET** `/api/chapter`
  - Query Parameters:
    - `page` (optional): Page number (default: 1)
    - `limit` (optional): Items per page (default: 10)
    - `unitId` (optional): Filter by unit ID
    - `subjectId` (optional): Filter by subject ID
    - `examId` (optional): Filter by exam ID
    - `status` (optional): Filter by status (`active`, `inactive`, `all`) (default: `active`)
  - Description: Get paginated list of chapters with optional filtering
  - Response: Returns chapters with populated exam, subject, and unit data, sorted by `orderNumber` and `createdAt`

### Create Chapter
- **POST** `/api/chapter`
  - Body: `{ name: string, examId: string, subjectId: string, unitId: string, status?: string, orderNumber?: number, weightage?: number, time?: number, questions?: number }`
  - Description: Create a new chapter
  - Notes: Chapter name is automatically capitalized. If `orderNumber` is not provided, it's auto-calculated.

### Get Single Chapter
- **GET** `/api/chapter/[id]`
  - Description: Get a single chapter by ID with populated unit, subject, and exam data

### Update Chapter
- **PUT** `/api/chapter/[id]`
  - Body: `{ name: string, examId?: string, subjectId?: string, unitId?: string, status?: string, orderNumber?: number, weightage?: number, time?: number, questions?: number }`
  - Description: Update chapter details
  - Notes: Chapter name is automatically capitalized

### Get Chapter Details (SEO/Content)
- **GET** `/api/chapter/[id]/details`
  - Description: Get chapter details (content, title, metaDescription, keywords)
  - Response: Returns details object or empty defaults if not found

### Create/Update Chapter Details
- **PUT** `/api/chapter/[id]/details`
  - Body: `{ content?: string, title?: string, metaDescription?: string, keywords?: string }`
  - Description: Create or update chapter details (upsert operation)

### Delete Chapter Details
- **DELETE** `/api/chapter/[id]/details`
  - Description: Delete chapter details

### Reorder Chapters
- **POST** or **PATCH** `/api/chapter/reorder`
  - Body: `{ chapters: Array<{ id: string, orderNumber: number }> }`
  - Description: Reorder multiple chapters at once
  - Notes: All chapters must belong to the same unit

### Update Chapter Status with Cascading
- **PATCH** `/api/chapter/[id]/status`
  - Body: `{ status: string }` (must be `active` or `inactive`)
  - Description: Update chapter status with cascading to all children (topics, subtopics)
  - Authentication: Required (requires action permissions)

### Delete Chapter
- **DELETE** `/api/chapter/[id]`
  - Description: Delete a chapter

---

## 📝 Topic Endpoints

### List Topics
- **GET** `/api/topic`
  - Query Parameters:
    - `page` (optional): Page number (default: 1)
    - `limit` (optional): Items per page (default: 10)
    - `chapterId` (optional): Filter by chapter ID
    - `unitId` (optional): Filter by unit ID
    - `subjectId` (optional): Filter by subject ID
    - `examId` (optional): Filter by exam ID
    - `status` (optional): Filter by status (`active`, `inactive`, `all`) (default: `active`)
  - Description: Get paginated list of topics with optional filtering
  - Authentication: Required (all authenticated users can view)
  - Response: Returns topics with populated exam, subject, unit, and chapter data, sorted by `orderNumber` and `createdAt`

### Create Topic(s)
- **POST** `/api/topic`
  - Body: `{ name: string, examId: string, subjectId: string, unitId: string, chapterId: string, status?: string, orderNumber?: number }` OR `Array<{ name: string, examId: string, subjectId: string, unitId: string, chapterId: string, status?: string, orderNumber?: number }>`
  - Description: Create a new topic or multiple topics at once
  - Authentication: Required (requires action permissions)
  - Notes: Topic name is automatically capitalized. Supports both single object and array of objects. If `orderNumber` is not provided, it's auto-calculated per chapter.

### Get Single Topic
- **GET** `/api/topic/[id]`
  - Description: Get a single topic by ID with populated chapter, unit, subject, and exam data
  - Authentication: Required (all authenticated users can view)

### Update Topic
- **PUT** `/api/topic/[id]`
  - Body: `{ name: string, examId?: string, subjectId?: string, unitId?: string, chapterId?: string, status?: string, orderNumber?: number }`
  - Description: Update topic details
  - Authentication: Required (requires action permissions)
  - Notes: Topic name is automatically capitalized

### Update Topic Status with Cascading
- **PATCH** `/api/topic/[id]/status`
  - Body: `{ status: string }` (must be `active` or `inactive`)
  - Description: Update topic status with cascading to all children (subtopics)
  - Authentication: Required (requires action permissions)

### Reorder Topics
- **POST** or **PATCH** `/api/topic/reorder`
  - Body: `{ topics: Array<{ id: string, orderNumber: number }> }`
  - Description: Reorder multiple topics at once
  - Authentication: Required (requires action permissions)
  - Notes: All topics must belong to the same chapter

### Delete Topic
- **DELETE** `/api/topic/[id]`
  - Description: Delete a topic
  - Authentication: Required (requires action permissions)

---

## 📄 SubTopic Endpoints

### List SubTopics
- **GET** `/api/subtopic`
  - Query Parameters:
    - `page` (optional): Page number (default: 1)
    - `limit` (optional): Items per page (default: 10)
    - `topicId` (optional): Filter by topic ID
    - `chapterId` (optional): Filter by chapter ID
    - `unitId` (optional): Filter by unit ID
    - `subjectId` (optional): Filter by subject ID
    - `examId` (optional): Filter by exam ID
    - `status` (optional): Filter by status (`active`, `inactive`, `all`) (default: `active`)
  - Description: Get paginated list of subtopics with optional filtering
  - Response: Returns subtopics with populated exam, subject, unit, chapter, and topic data, sorted by `orderNumber` and `createdAt`

### Create SubTopic(s)
- **POST** `/api/subtopic`
  - Body: `{ name: string, examId: string, subjectId: string, unitId: string, chapterId: string, topicId: string, status?: string, orderNumber?: number }` OR `Array<{ name: string, examId: string, subjectId: string, unitId: string, chapterId: string, topicId: string, status?: string, orderNumber?: number }>`
  - Description: Create a new subtopic or multiple subtopics at once
  - Notes: SubTopic name is automatically capitalized. Supports both single object and array of objects. If `orderNumber` is not provided, it's auto-calculated per topic.

### Get Single SubTopic
- **GET** `/api/subtopic/[id]`
  - Description: Get a single subtopic by ID with populated topic, chapter, unit, subject, and exam data

### Update SubTopic
- **PUT** `/api/subtopic/[id]`
  - Body: `{ name: string, examId?: string, subjectId?: string, unitId?: string, chapterId?: string, topicId?: string, status?: string, orderNumber?: number }`
  - Description: Update subtopic details
  - Notes: SubTopic name is automatically capitalized

### Update SubTopic Status
- **PATCH** `/api/subtopic/[id]/status`
  - Body: `{ status: string }` (must be `active` or `inactive`)
  - Description: Update subtopic status (no cascading as subtopics are leaf nodes)

### Reorder SubTopics
- **POST** or **PATCH** `/api/subtopic/reorder`
  - Body: `{ subtopics: Array<{ id: string, orderNumber: number }> }`
  - Description: Reorder multiple subtopics at once
  - Notes: All subtopics must belong to the same topic

### Delete SubTopic
- **DELETE** `/api/subtopic/[id]`
  - Description: Delete a subtopic

---

## 📋 Practice Category Endpoints

### List Practice Categories
- **GET** `/api/practice/category`
  - Query Parameters:
    - `page` (optional): Page number (default: 1)
    - `limit` (optional): Items per page (default: 10)
    - `examId` (optional): Filter by exam ID
    - `subjectId` (optional): Filter by subject ID
    - `status` (optional): Filter by status (`active`, `inactive`, `all`) (default: `active`)
  - Description: Get paginated list of practice categories with optional filtering
  - Response: Returns categories with populated exam and subject data, sorted by `orderNumber` and `createdAt`

### Create Practice Category
- **POST** `/api/practice/category`
  - Body: `{ name: string, examId: string, subjectId?: string, status?: string, orderNumber?: number, description?: string, noOfTests?: number, mode?: string, duration?: string, language?: string }`
  - Description: Create a new practice category
  - Notes: Category name is automatically capitalized. If `orderNumber` is not provided, it's auto-calculated. Default values: `mode: "Online Test"`, `language: "English"`.

### Get Single Practice Category
- **GET** `/api/practice/category/[id]`
  - Description: Get a single practice category by ID with populated exam and subject data

### Update Practice Category
- **PUT** `/api/practice/category/[id]`
  - Body: `{ name: string, examId?: string, subjectId?: string, status?: string, orderNumber?: number, description?: string, noOfTests?: number, mode?: string, duration?: string, language?: string }`
  - Description: Update practice category details
  - Notes: Category name is automatically capitalized

### Update Practice Category (Partial)
- **PATCH** `/api/practice/category/[id]`
  - Body: `{ name?: string, examId?: string, subjectId?: string, status?: string, orderNumber?: number, description?: string, noOfTests?: number, mode?: string, duration?: string, language?: string }`
  - Description: Partial update of practice category fields

### Update Practice Category Status
- **PATCH** `/api/practice/category/[id]/status`
  - Body: `{ status: string }` (must be `active` or `inactive`)
  - Description: Update practice category status

### Delete Practice Category
- **DELETE** `/api/practice/category/[id]`
  - Description: Delete a practice category

---

## 📋 Practice SubCategory Endpoints

### List Practice SubCategories
- **GET** `/api/practice/subcategory`
  - Query Parameters:
    - `page` (optional): Page number (default: 1)
    - `limit` (optional): Items per page (default: 10)
    - `categoryId` (optional): Filter by category ID
    - `status` (optional): Filter by status (`active`, `inactive`, `all`) (default: `active`)
  - Description: Get paginated list of practice subcategories with optional filtering
  - Authentication: Required (all authenticated users can view)
  - Response: Returns subcategories with populated category, unit, chapter, topic, and subtopic data, sorted by `orderNumber` and `createdAt`

### Create Practice SubCategory
- **POST** `/api/practice/subcategory`
  - Body: `{ name: string, categoryId: string, unitId?: string, chapterId?: string, topicId?: string, subTopicId?: string, duration?: string, maximumMarks?: number, numberOfQuestions?: number, negativeMarks?: number, orderNumber?: number, status?: string, description?: string }`
  - Description: Create a new practice subcategory
  - Authentication: Required (requires action permissions)
  - Notes: SubCategory name is automatically capitalized. If `orderNumber` is not provided, it's auto-calculated. Numeric fields default to 0 if not provided.

### Get Single Practice SubCategory
- **GET** `/api/practice/subcategory/[id]`
  - Description: Get a single practice subcategory by ID with populated category and hierarchical data
  - Authentication: Required (all authenticated users can view)

### Update Practice SubCategory
- **PUT** `/api/practice/subcategory/[id]`
  - Body: `{ name: string, categoryId?: string, unitId?: string, chapterId?: string, topicId?: string, subTopicId?: string, duration?: string, maximumMarks?: number, numberOfQuestions?: number, negativeMarks?: number, orderNumber?: number, status?: string, description?: string }`
  - Description: Update practice subcategory details
  - Authentication: Required (requires action permissions)
  - Notes: SubCategory name is automatically capitalized

### Update Practice SubCategory (Partial)
- **PATCH** `/api/practice/subcategory/[id]`
  - Body: `{ name?: string, categoryId?: string, unitId?: string, chapterId?: string, topicId?: string, subTopicId?: string, duration?: string, maximumMarks?: number, numberOfQuestions?: number, negativeMarks?: number, orderNumber?: string, status?: string, description?: string }`
  - Description: Partial update of practice subcategory fields
  - Authentication: Required (requires action permissions)

### Update Practice SubCategory Status
- **PATCH** `/api/practice/subcategory/[id]/status`
  - Body: `{ status: string }` (must be `active` or `inactive`)
  - Description: Update practice subcategory status
  - Authentication: Required (requires action permissions)

### Delete Practice SubCategory
- **DELETE** `/api/practice/subcategory/[id]`
  - Description: Delete a practice subcategory
  - Authentication: Required (requires action permissions)

---

## 📋 Practice Question Endpoints

### List Practice Questions
- **GET** `/api/practice/question`
  - Query Parameters:
    - `page` (optional): Page number (default: 1)
    - `limit` (optional): Items per page (default: 10)
    - `subCategoryId` (optional): Filter by subcategory ID
    - `status` (optional): Filter by status (`active`, `inactive`, `all`) (default: `active`)
  - Description: Get paginated list of practice questions with optional filtering
  - Response: Returns questions with populated subcategory data, sorted by `orderNumber` and `createdAt`

### Create Practice Question
- **POST** `/api/practice/question`
  - Body: `{ question: string, optionA: string, optionB: string, optionC: string, optionD: string, answer: string, subCategoryId: string, videoLink?: string, detailsExplanation?: string, orderNumber?: number, status?: string }`
  - Description: Create a new practice question
  - Notes: `answer` must be "A", "B", "C", or "D" (case-insensitive, converted to uppercase). If `orderNumber` is not provided, it's auto-calculated.

### Get Single Practice Question
- **GET** `/api/practice/question/[id]`
  - Description: Get a single practice question by ID with populated subcategory data

### Update Practice Question
- **PUT** `/api/practice/question/[id]`
  - Body: `{ question: string, optionA: string, optionB: string, optionC: string, optionD: string, answer: string, subCategoryId?: string, videoLink?: string, detailsExplanation?: string, orderNumber?: number, status?: string }`
  - Description: Update practice question details
  - Notes: `answer` must be "A", "B", "C", or "D" (case-insensitive, converted to uppercase)

### Update Practice Question (Partial)
- **PATCH** `/api/practice/question/[id]`
  - Body: `{ question?: string, optionA?: string, optionB?: string, optionC?: string, optionD?: string, answer?: string, subCategoryId?: string, videoLink?: string, detailsExplanation?: string, orderNumber?: number, status?: string }`
  - Description: Partial update of practice question fields
  - Notes: All provided fields are validated. Empty strings are not allowed for question and options.

### Update Practice Question Status
- **PATCH** `/api/practice/question/[id]/status`
  - Body: `{ status: string }` (must be `active` or `inactive`)
  - Description: Update practice question status

### Delete Practice Question
- **DELETE** `/api/practice/question/[id]`
  - Description: Delete a practice question

---

## 👤 User Endpoints

### List Users
- **GET** `/api/user`
  - Query Parameters:
    - `page` (optional): Page number (default: 1)
    - `limit` (optional): Items per page (default: 10)
    - `role` (optional): Filter by role
    - `status` (optional): Filter by status
    - `search` (optional): Search by name or email
  - Description: Get paginated list of users with optional filtering
  - Authentication: Required (admin only - requires user management permissions)
  - Response: Returns users without password field, sorted by `createdAt` (descending)

### Create User
- **POST** `/api/user`
  - Body: `{ name: string, email: string, password: string, role: string }`
  - Description: Create a new user (admin only)
  - Authentication: Required (admin only - requires user management permissions)
  - Notes: Valid roles: `admin`, `super_moderator`, `moderator`, `editor`, `viewer`. Password must be at least 6 characters.

### Get Single User
- **GET** `/api/user/[id]`
  - Description: Get a single user by ID
  - Authentication: Required (admin only - requires user management permissions)
  - Response: Returns user without password field

### Update User
- **PUT** `/api/user/[id]`
  - Body: `{ name?: string, email?: string, password?: string, role?: string, status?: string }`
  - Description: Update user details
  - Authentication: Required
  - Notes: Users can update their own profile (name, email, password). Only admins can update role and status. Password must be at least 6 characters if provided.

### Delete User
- **DELETE** `/api/user/[id]`
  - Description: Delete a user
  - Authentication: Required (admin only - requires user management permissions)

---

## 🔐 Authentication Endpoints

### Login
- **POST** `/api/auth/login`
  - Body: `{ email: string, password: string }`
  - Description: Authenticate user and get JWT token
  - Response: Returns user object and JWT token
  - Notes: Updates user's `lastLogin` timestamp. Only active users can login.

### Register
- **POST** `/api/auth/register`
  - Body: `{ name: string, email: string, password: string, adminCode: string }`
  - Description: Register a new admin user
  - Response: Returns user object and JWT token
  - Notes: Requires valid admin registration code. Password must be at least 6 characters. Default role is `admin`.

### Verify Token
- **GET** `/api/auth/verify`
  - Description: Verify JWT token and get user information
  - Authentication: Required (valid JWT token in Authorization header)
  - Response: Returns user object if token is valid

---

## 📋 Common Query Parameters

### Pagination
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

### Status Filtering
- `status`: Filter by status
  - `active`: Only active items
  - `inactive`: Only inactive items
  - `all`: All items regardless of status

### Hierarchical Filtering
- `examId`: Filter by exam ID
- `subjectId`: Filter by subject ID
- `unitId`: Filter by unit ID
- `chapterId`: Filter by chapter ID
- `topicId`: Filter by topic ID
- `categoryId`: Filter by practice category ID
- `subCategoryId`: Filter by practice subcategory ID

### Search
- `search`: Search query (for user endpoints, searches name and email)

---

## 📝 Response Format

All endpoints follow a consistent response format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Error details"
}
```

---

## 🔄 Cascading Status Updates

When updating status on parent items, the change cascades to all children:

- **Exam** → Updates all Subjects, Units, Chapters, Topics, and SubTopics
- **Subject** → Updates all Units, Chapters, Topics, and SubTopics
- **Unit** → Updates all Chapters, Topics, and SubTopics
- **Chapter** → Updates all Topics and SubTopics
- **Topic** → Updates all SubTopics
- **SubTopic** → No cascading (leaf node)

---

## 🔒 Authentication & Authorization

### Authentication Methods
- JWT token in `Authorization` header: `Bearer <token>`
- Token expiration: Configurable via `JWT_EXPIRES_IN` environment variable (default: 24h)

### Permission Levels
- **Admin**: Full access to all endpoints
- **Super Moderator**: Can perform most actions
- **Moderator**: Limited editing capabilities
- **Editor**: Can create and edit content
- **Viewer**: Read-only access

### Permission Checks
- `requireAuth`: All authenticated users can access
- `requireAction`: Requires appropriate permissions for the action (POST, PUT, PATCH, DELETE)
- `requireUserManagement`: Admin only (for user management endpoints)

---

## 📊 Notes

1. **ID Format**: All ID parameters must be valid MongoDB ObjectIds
2. **Status Values**: Must be either `"active"` or `"inactive"` (case-insensitive)
3. **Pagination**: Available on all list endpoints
4. **Hierarchical Filtering**: Allows filtering by any parent level
5. **Reorder Endpoints**: Accept arrays of items with `id` and `orderNumber` properties
6. **Cache**: Implemented for active status queries (5-minute TTL)
7. **Auto-calculation**: `orderNumber` is auto-calculated if not provided during creation
8. **Name Formatting**: 
   - Exam names are converted to UPPERCASE
   - Subject, Unit, Chapter, Topic, and SubTopic names are capitalized (first letter of each word)
   - Practice Category and SubCategory names are capitalized
9. **Bulk Creation**: Topic and SubTopic endpoints support creating multiple items at once by sending an array
10. **Details Endpoints**: Separate endpoints for SEO/content fields (content, title, metaDescription, keywords) for Exam, Subject, Unit, and Chapter
11. **Two-Step Reordering**: Reorder endpoints use a two-step process (temporary high order numbers, then final order numbers) to avoid duplicate key conflicts

---

## 🚀 Performance Optimizations

1. **Caching**: Active status queries are cached for 5 minutes (LRU cache with max 50 entries)
2. **Optimized Queries**: Count queries are skipped for large result sets when not needed
3. **Parallel Execution**: Where possible, queries are executed in parallel
4. **Selective Population**: Only necessary fields are populated in related documents
5. **Lean Queries**: Results are returned as plain JavaScript objects for better performance
