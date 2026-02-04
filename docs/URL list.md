# Admin Panel – URL List (Units to Definition Level)

**Exam:** NEET  
**Subjects:** Physics, Chemistry, Biology  

**Base URL (complete):** `http://194.238.17.203:3001/self-study`  
Replace with your actual domain in production (e.g. `https://www.testprepkart.com/self-study`).

---

## 1. Hierarchy (Units → Definition)

- **Exam** → **Subject** → **Unit** → **Chapter** → **Topic** → **Sub Topic** → **Definition**

---

## 2. Complete URL Format

Every admin URL follows this pattern:

```
{BASE_URL}/admin/{resource}/{id}
```

**Example (definition detail):**  
`http://194.238.17.203:3001/self-study/admin/definitions/694e5a2faa2c0815cf18857d`

Where:
- `{BASE_URL}` = `http://194.238.17.203:3001/self-study` (or your domain + base path)
- `{resource}` = exam | subject | unit | chapter | topic | sub-topic | definitions
- `{id}` = MongoDB `_id` (24-character hex, e.g. `694e5a2faa2c0815cf18857d`)

---

## 3. Complete URLs by Level

Replace `{id}` with the actual `_id` from your database for each item.

### Exam (NEET)

| Page         | Complete URL |
|--------------|--------------|
| Exams list   | `http://194.238.17.203:3001/self-study/admin/exam` |
| NEET detail  | `http://194.238.17.203:3001/self-study/admin/exam/{NEET_EXAM_ID}` |

### Subject (Physics, Chemistry, Biology)

| Page            | Complete URL |
|-----------------|--------------|
| Subjects list   | `http://194.238.17.203:3001/self-study/admin/subject` |
| Physics detail  | `http://194.238.17.203:3001/self-study/admin/subject/{PHYSICS_SUBJECT_ID}` |
| Chemistry detail| `http://194.238.17.203:3001/self-study/admin/subject/{CHEMISTRY_SUBJECT_ID}` |
| Biology detail  | `http://194.238.17.203:3001/self-study/admin/subject/{BIOLOGY_SUBJECT_ID}` |

### Unit

| Page        | Complete URL |
|------------|---------------|
| Units list | `http://194.238.17.203:3001/self-study/admin/unit` |
| Unit detail| `http://194.238.17.203:3001/self-study/admin/unit/{unitId}` |

**Example:**  
`http://194.238.17.203:3001/self-study/admin/unit/694e5a2faa2c0815cf18857a`

### Chapter

| Page          | Complete URL |
|---------------|---------------|
| Chapters list | `http://194.238.17.203:3001/self-study/admin/chapter` |
| Chapter detail| `http://194.238.17.203:3001/self-study/admin/chapter/{chapterId}` |

**Example:**  
`http://194.238.17.203:3001/self-study/admin/chapter/694e5a2faa2c0815cf18857b`

### Topic

| Page         | Complete URL |
|-------------|---------------|
| Topics list | `http://194.238.17.203:3001/self-study/admin/topic` |
| Topic detail| `http://194.238.17.203:3001/self-study/admin/topic/{topicId}` |

**Example:**  
`http://194.238.17.203:3001/self-study/admin/topic/694e5a2faa2c0815cf18857c`

### Sub Topic

| Page             | Complete URL |
|------------------|---------------|
| Sub Topics list  | `http://194.238.17.203:3001/self-study/admin/sub-topic` |
| Sub Topic detail | `http://194.238.17.203:3001/self-study/admin/sub-topic/{subTopicId}` |

**Example:**  
`http://194.238.17.203:3001/self-study/admin/sub-topic/694e5a2faa2c0815cf18857e`

### Definition

| Page             | Complete URL |
|------------------|---------------|
| Definitions list | `http://194.238.17.203:3001/self-study/admin/definitions` |
| Definition detail| `http://194.238.17.203:3001/self-study/admin/definitions/{definitionId}` |

**Example:**  
`http://194.238.17.203:3001/self-study/admin/definitions/694e5a2faa2c0815cf18857d`

---

## 4. Full URL Pattern Summary (Units → Definition)

| Level      | List (complete URL) | Detail (complete URL pattern) |
|-----------|----------------------|-------------------------------|
| Exam      | `http://194.238.17.203:3001/self-study/admin/exam` | `http://194.238.17.203:3001/self-study/admin/exam/{examId}` |
| Subject   | `http://194.238.17.203:3001/self-study/admin/subject` | `http://194.238.17.203:3001/self-study/admin/subject/{subjectId}` |
| Unit      | `http://194.238.17.203:3001/self-study/admin/unit` | `http://194.238.17.203:3001/self-study/admin/unit/{unitId}` |
| Chapter   | `http://194.238.17.203:3001/self-study/admin/chapter` | `http://194.238.17.203:3001/self-study/admin/chapter/{chapterId}` |
| Topic     | `http://194.238.17.203:3001/self-study/admin/topic` | `http://194.238.17.203:3001/self-study/admin/topic/{topicId}` |
| Sub Topic | `http://194.238.17.203:3001/self-study/admin/sub-topic` | `http://194.238.17.203:3001/self-study/admin/sub-topic/{subTopicId}` |
| Definition| `http://194.238.17.203:3001/self-study/admin/definitions` | `http://194.238.17.203:3001/self-study/admin/definitions/{definitionId}` |

---

## 5. How to Build Your Full URL List

1. Open **Exams list:** `http://194.238.17.203:3001/self-study/admin/exam` → get NEET exam id.
2. Open **Subjects list:** `http://194.238.17.203:3001/self-study/admin/subject` → get Physics, Chemistry, Biology subject ids.
3. For each subject, open **Units list** (filter by subject) → get unit ids → build `http://194.238.17.203:3001/self-study/admin/unit/{unitId}` for each.
4. For each unit, open **Chapters list** → get chapter ids → build `http://194.238.17.203:3001/self-study/admin/chapter/{chapterId}`.
5. For each chapter, open **Topics list** → get topic ids → build `http://194.238.17.203:3001/self-study/admin/topic/{topicId}`.
6. For each topic, open **Sub Topics list** → get sub topic ids → build `http://194.238.17.203:3001/self-study/admin/sub-topic/{subTopicId}`.
7. For each sub topic, open **Definitions list** → get definition ids → build `http://194.238.17.203:3001/self-study/admin/definitions/{definitionId}`.

Each of those detail URLs is a complete admin URL in the same form as:  
`http://194.238.17.203:3001/self-study/admin/definitions/694e5a2faa2c0815cf18857d`
