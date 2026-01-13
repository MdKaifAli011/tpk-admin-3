# API Endpoints - URL List

Base URL: `/api`

## 📚 Exam APIs

```
GET    /api/exam
POST   /api/exam
GET    /api/exam/[id]
PUT    /api/exam/[id]
PATCH  /api/exam/[id]
DELETE /api/exam/[id]
```

## 📖 Subject APIs

```
GET    /api/subject
POST   /api/subject
GET    /api/subject/[id]
PUT    /api/subject/[id]
PATCH  /api/subject/[id]
DELETE /api/subject/[id]
PATCH  /api/subject/[id]/status
```

## 📚 Unit APIs

```
GET    /api/unit
POST   /api/unit
GET    /api/unit/[id]
PUT    /api/unit/[id]
PATCH  /api/unit/[id]
DELETE /api/unit/[id]
PATCH  /api/unit/reorder
PATCH  /api/unit/[id]/status
```

## 📑 Chapter APIs

```
GET    /api/chapter
POST   /api/chapter
GET    /api/chapter/[id]
PUT    /api/chapter/[id]
PATCH  /api/chapter/[id]
DELETE /api/chapter/[id]
POST   /api/chapter/reorder
PATCH  /api/chapter/reorder
PATCH  /api/chapter/[id]/status
```

## 📝 Topic APIs

```
GET    /api/topic
POST   /api/topic
GET    /api/topic/[id]
PUT    /api/topic/[id]
PATCH  /api/topic/[id]
DELETE /api/topic/[id]
PATCH  /api/topic/reorder
PATCH  /api/topic/[id]/status
```

## 📄 SubTopic APIs

```
GET    /api/subtopic
POST   /api/subtopic
GET    /api/subtopic/[id]
PUT    /api/subtopic/[id]
PATCH  /api/subtopic/[id]
DELETE /api/subtopic/[id]
PATCH  /api/subtopic/reorder
PATCH  /api/subtopic/[id]/status
```

---

## 📋 Summary

**Total Endpoints: 42**

- **Exam**: 6 endpoints
- **Subject**: 7 endpoints
- **Unit**: 8 endpoints
- **Chapter**: 9 endpoints
- **Topic**: 8 endpoints
- **SubTopic**: 8 endpoints

---

## 🔍 Query Parameters (for GET endpoints)

### Pagination
- `?page=1&limit=10`

### Status Filter
- `?status=active` (default)
- `?status=inactive`
- `?status=all`

### Hierarchical Filter
- `?examId=<id>`
- `?subjectId=<id>`
- `?unitId=<id>`
- `?chapterId=<id>`
- `?topicId=<id>`

### Examples
```
GET /api/exam?page=1&limit=10&status=active
GET /api/subject?examId=507f1f77bcf86cd799439011&status=all
GET /api/unit?subjectId=507f1f77bcf86cd799439011&page=1&limit=20
GET /api/chapter?unitId=507f1f77bcf86cd799439011&status=active
GET /api/topic?chapterId=507f1f77bcf86cd799439011
GET /api/subtopic?topicId=507f1f77bcf86cd799439011&status=all
```

---

## 🔄 Reorder Endpoints

These endpoints accept arrays of items to reorder:

```
PATCH /api/unit/reorder
POST  /api/chapter/reorder
PATCH /api/chapter/reorder
PATCH /api/topic/reorder
PATCH /api/subtopic/reorder
```

**Request Body:**
```json
{
  "units": [
    { "id": "507f1f77bcf86cd799439011", "orderNumber": 1 },
    { "id": "507f1f77bcf86cd799439012", "orderNumber": 2 }
  ]
}
```

---

## 🎯 Status Update Endpoints (with Cascading)

These endpoints update status and cascade to all children:

```
PATCH /api/exam/[id]          (cascades to all children)
PATCH /api/subject/[id]/status (cascades to units, chapters, topics, subtopics)
PATCH /api/unit/[id]/status    (cascades to chapters, topics, subtopics)
PATCH /api/chapter/[id]/status (cascades to topics, subtopics)
PATCH /api/topic/[id]/status   (cascades to subtopics)
PATCH /api/subtopic/[id]/status (no cascading - leaf node)
```

