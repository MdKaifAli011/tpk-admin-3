# Blog API Documentation

Complete list of all Blog-related API endpoints in the application.

## Table of Contents

1. [Blog APIs](#blog-apis)
2. [Blog Details APIs](#blog-details-apis)
3. [Blog Category APIs](#blog-category-apis)
4. [Client-Side API Functions](#client-side-api-functions)

---

## Blog APIs

### 1. GET `/api/blog`

**Description:** Fetch all blogs with optional filtering

**Authentication:**

- Public access for `status=active` or `status=ACTIVE`
- Requires authentication for other status filters (admin access)

**Query Parameters:**

- `status` (optional): Filter by status (`active`, `inactive`, `draft`, `all`) - defaults to `all`
- `examId` (optional): Filter blogs by exam ID

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Blog Title",
      "slug": "blog-title",
      "categoryId": {...},
      "examId": {...},
      "status": "active",
      "image": "https://...",
      "author": "Admin",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

**Features:**

- Sorts by newest first (`createdAt: -1`)
- Populates `examId` (name, slug) and `categoryId` (name)

---

### 2. POST `/api/blog`

**Description:** Create a new blog

**Authentication:** Required (admin or sub_admin role)

**Request Body:**

```json
{
  "name": "Blog Title",
  "categoryId": "category_id_here",
  "category": "Legacy category name (optional)",
  "status": "draft",
  "examId": "exam_id_here",
  "image": "https://example.com/image.jpg"
}
```

**Response:**

```json
{
  "success": true,
  "data": {...},
  "message": "Blog created successfully"
}
```

**Validation:**

- `name` is required and must be non-empty
- Auto-detects author from authenticated user
- Returns 409 if blog with same name already exists

---

### 3. GET `/api/blog/[id]`

**Description:** Fetch a single blog by ID or slug

**Authentication:** Public access (no auth required)

**Parameters:**

- `id`: Blog ID (MongoDB ObjectId) or slug

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Blog Title",
    "slug": "blog-title",
    "categoryId": {...},
    "examId": {...},
    "status": "active",
    "image": "https://...",
    "author": "Admin",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Features:**

- Tries to find by ID first (if valid ObjectId)
- Falls back to slug lookup (only for active blogs)
- Populates exam and category info
- Returns 404 if not found

---

### 4. PUT `/api/blog/[id]`

**Description:** Update a blog's core fields

**Authentication:** Required

**Parameters:**

- `id`: Blog ID (MongoDB ObjectId)

**Request Body:**

```json
{
  "name": "Updated Blog Title",
  "categoryId": "category_id_here",
  "category": "Legacy category (optional)",
  "status": "active",
  "examId": "exam_id_here",
  "image": "https://example.com/image.jpg"
}
```

**Response:**

```json
{
  "success": true,
  "data": {...},
  "message": "Blog updated successfully"
}
```

**Validation:**

- Requires valid MongoDB ObjectId
- Returns 404 if blog not found

---

### 5. DELETE `/api/blog/[id]`

**Description:** Delete a blog

**Authentication:** Required

**Parameters:**

- `id`: Blog ID (MongoDB ObjectId)

**Response:**

```json
{
  "success": true,
  "data": {...},
  "message": "Blog deleted successfully"
}
```

**Features:**

- Triggers cascade delete middleware (deletes associated BlogDetails)
- Returns 404 if blog not found

---

## Blog Details APIs

### 6. GET `/api/blog/[id]/details`

**Description:** Fetch blog details (content, SEO fields)

**Authentication:** Public access (no auth required)

**Parameters:**

- `id`: Blog ID (MongoDB ObjectId)

**Query Parameters:**

- `excludeContent` (optional): Set to `true` to exclude content field (useful for card listings)

**Response:**

```json
{
  "success": true,
  "data": {
    "blogId": "...",
    "content": "Full blog content in HTML...",
    "title": "SEO Title",
    "metaDescription": "SEO description",
    "shortDescription": "Short description for cards",
    "keywords": "keyword1, keyword2"
  }
}
```

**Features:**

- Returns `null` if details don't exist yet (acceptable)
- Can exclude content field for performance when fetching for listings

---

### 7. PUT `/api/blog/[id]/details`

**Description:** Update or create blog details (upsert)

**Authentication:** Required

**Parameters:**

- `id`: Blog ID (MongoDB ObjectId)

**Request Body:**

```json
{
  "content": "Full blog content in HTML...",
  "title": "SEO Title",
  "metaDescription": "SEO description",
  "shortDescription": "Short description for cards",
  "keywords": "keyword1, keyword2"
}
```

**Response:**

```json
{
  "success": true,
  "data": {...},
  "message": "Blog details saved successfully"
}
```

**Features:**

- Upsert operation: creates if doesn't exist, updates if exists
- All fields are optional

---

## Blog Category APIs

### 8. GET `/api/blog/category`

**Description:** Fetch all blog categories with optional filtering

**Authentication:**

- Public access for `status=active` or `status=ACTIVE`
- Requires authentication for other status filters (admin access)

**Query Parameters:**

- `status` (optional): Filter by status (`active`, `inactive`, `all`) - defaults to `active`
- `examId` (optional): Filter categories by exam ID
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Category Name",
      "examId": {...},
      "orderNumber": 1,
      "status": "active",
      "description": "...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 10,
    "totalPages": 1
  }
}
```

**Features:**

- Sorted by `orderNumber` (ascending), then `createdAt` (descending)
- Populates `examId` (name, status)
- Cached for active status queries
- Case-insensitive status matching

---

### 9. POST `/api/blog/category`

**Description:** Create a new blog category

**Authentication:** Required

**Request Body:**

```json
{
  "name": "Category Name",
  "examId": "exam_id_here",
  "orderNumber": 1,
  "status": "active",
  "description": "Category description"
}
```

**Response:**

```json
{
  "success": true,
  "data": {...},
  "message": "Blog category created successfully"
}
```

**Validation:**

- `name` and `examId` are required
- `examId` must be valid MongoDB ObjectId
- Exam must exist
- Category name is auto-formatted to Title Case
- Returns 409 if duplicate category name exists for same exam
- Auto-generates `orderNumber` if not provided

---

### 10. GET `/api/blog/category/[id]`

**Description:** Fetch a single blog category by ID

**Authentication:** Required

**Parameters:**

- `id`: Category ID (MongoDB ObjectId)

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Category Name",
    "examId": {...},
    "orderNumber": 1,
    "status": "active",
    "description": "..."
  }
}
```

**Features:**

- Populates `examId` (name, status)
- Returns 404 if not found

---

### 11. PUT `/api/blog/category/[id]`

**Description:** Update a blog category

**Authentication:** Required

**Parameters:**

- `id`: Category ID (MongoDB ObjectId)

**Request Body:**

```json
{
  "name": "Updated Category Name",
  "examId": "exam_id_here",
  "orderNumber": 1,
  "status": "active",
  "description": "Updated description"
}
```

**Response:**

```json
{
  "success": true,
  "data": {...},
  "message": "Blog category updated successfully"
}
```

**Validation:**

- `name` is required
- Checks for duplicate names (excluding current category)
- Category name is auto-formatted to Title Case
- Clears cache after update

---

### 12. PATCH `/api/blog/category/[id]`

**Description:** Partially update a blog category (status toggle, etc.)

**Authentication:** Required

**Parameters:**

- `id`: Category ID (MongoDB ObjectId)

**Request Body:**

```json
{
  "status": "inactive"
}
```

(Any combination of: `name`, `description`, `examId`, `orderNumber`, `status`)

**Response:**

```json
{
  "success": true,
  "data": {...},
  "message": "Blog category updated successfully"
}
```

**Features:**

- Allows partial updates
- Useful for status toggles
- Clears cache after update

---

### 13. DELETE `/api/blog/category/[id]`

**Description:** Delete a blog category

**Authentication:** Required

**Parameters:**

- `id`: Category ID (MongoDB ObjectId)

**Response:**

```json
{
  "success": true,
  "data": {...},
  "message": "Blog category deleted successfully"
}
```

**Features:**

- Clears cache after deletion
- Returns 404 if not found

---

## Client-Side API Functions

These functions are available in `app/(main)/lib/api.js` for client-side usage:

### `fetchBlogs(options)`

**Description:** Fetch blogs with filtering options

**Parameters:**

```javascript
{
  examId: null,        // Filter by exam ID
  status: "active",    // Filter by status
  limit: 100          // Limit results
}
```

**Returns:** Array of blog objects

**Usage:**

```javascript
const blogs = await fetchBlogs({
  examId: "exam_id_here",
  status: "active",
  limit: 50,
});
```

---

### `fetchBlogBySlug(slug)`

**Description:** Fetch a single blog by slug

**Parameters:**

- `slug`: Blog slug string

**Returns:** Blog object or `null`

**Usage:**

```javascript
const blog = await fetchBlogBySlug("my-blog-post");
```

---

### `fetchBlogDetails(blogId, options)`

**Description:** Fetch blog details (content, SEO fields)

**Parameters:**

- `blogId`: Blog ID
- `options`: `{ excludeContent: false }` - Set to `true` to exclude content field

**Returns:** Blog details object or `null`

**Usage:**

```javascript
// Full details
const details = await fetchBlogDetails("blog_id_here");

// Without content (for listings)
const details = await fetchBlogDetails("blog_id_here", {
  excludeContent: true,
});
```

---

### `fetchBlogCategories(options)`

**Description:** Fetch blog categories with filtering

**Parameters:**

```javascript
{
  examId: null,        // Filter by exam ID
  status: "active",    // Filter by status
  limit: 100          // Limit results
}
```

**Returns:** Array of category objects

**Usage:**

```javascript
const categories = await fetchBlogCategories({
  examId: "exam_id_here",
  status: "active",
});
```

---

## Authentication & Authorization

### Public Endpoints (No Auth Required)

- `GET /api/blog` (when `status=active`)
- `GET /api/blog/[id]`
- `GET /api/blog/[id]/details`
- `GET /api/blog/category` (when `status=active`)

### Protected Endpoints (Auth Required)

- `POST /api/blog`
- `PUT /api/blog/[id]`
- `DELETE /api/blog/[id]`
- `PUT /api/blog/[id]/details`
- `POST /api/blog/category`
- `GET /api/blog/category/[id]`
- `PUT /api/blog/category/[id]`
- `PATCH /api/blog/category/[id]`
- `DELETE /api/blog/category/[id]`
- `GET /api/blog` (when `status!=active`)
- `GET /api/blog/category` (when `status!=active`)

---

## Response Format

All API responses follow this standard format:

**Success Response:**

```json
{
  "success": true,
  "data": {...},
  "message": "Optional success message"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Error message",
  "status": 400
}
```

**Pagination Response:**

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 50,
    "totalPages": 1
  }
}
```

---

## Notes

1. **Slug Support:** Blog GET endpoints support both ID and slug lookup
2. **Caching:** Blog categories are cached for active status queries
3. **Cascade Delete:** Deleting a blog automatically deletes its associated BlogDetails
4. **Title Case:** Category names are automatically formatted to Title Case
5. **Order Numbers:** Category order numbers are auto-generated if not provided
6. **Public Access:** Active blogs and categories are publicly accessible without authentication
7. **SEO Fields:** Blog details include SEO fields (title, metaDescription, keywords) separate from content
