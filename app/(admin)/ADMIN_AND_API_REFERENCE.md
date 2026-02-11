# Admin Management System & API — Deep Reference

This document summarizes the admin app structure, management features, APIs, auth, and patterns so tasks can be done consistently.

---

## 1. Admin App Structure

### Layout & auth
- **`app/(admin)/layout.js`** (client): Wraps all admin routes. Checks `localStorage.token`, verifies via `GET /api/auth/verify`; redirects to `/admin/login` if no token or invalid. Renders `AuthGuard` → `ErrorBoundary` → main area (Header + Sidebar + children). Login/register routes render children only (no sidebar).
- **`app/(admin)/components/auth/AuthGuard.jsx`**: After layout auth, checks route permission via `canAccessRoute(pathname, role)` from `config/adminRoutes.js`. Redirects to `/admin` if user cannot access path. Reads `user` from localStorage (set after verify).
- **Base path**: `lib/api.js` uses `NEXT_PUBLIC_BASE_PATH` (e.g. `/self-study`). Admin routes are under `/admin/*`.

### Routes (config & sidebar)
- **`app/(admin)/config/adminRoutes.js`**:
  - `ROLE_ORDER`: viewer < editor < moderator < super_moderator < admin.
  - `ROUTE_PERMISSIONS`: path prefix → min role (e.g. `/admin/user-role` → admin, `/admin/notification` → moderator, `/admin/exam` → viewer). Longest match wins.
  - `canAccessRoute(pathname, userRole)`, `getMinRoleForPath(pathname)`, `hasMinimumRole(userRole, requiredRole)`.
- **`app/(admin)/layouts/Sidebar.jsx`**: Menu built from `ALL_MENU_ITEMS`. Each item/child filtered by `canAccessRoute(child.href, role)`. Sections: Self Study (exam, subject, unit, chapter, topic, sub-topic, definitions), Test Papers (practice), Download (folder, subfolder, file), Blog (posts, category, comment), Pages, Discussion (threads, banner, import), Analytics (IP management), Admin (lead, students, forms, user-role, overview-comments, notification, bulk-import, seo-import, url-export).

### Page pattern
- Admin pages under `app/(admin)/admin/<feature>/page.js` (or `[id]/page.js`, etc.) typically render a single feature component, e.g. `<ExamManagement />`, `<NotificationManagement />`.

---

## 2. API Client & Auth

- **`lib/api.js`**: Axios instance, `baseURL: ${basePath}/api`. Request interceptor: for admin panel adds `Authorization: Bearer <token>` from `localStorage.token`; for student APIs (e.g. `/student/`, discussion, blog comment POST) uses `student_token` on main app and `token` on admin. 401: clears token and redirects (admin → `/admin/login`, student → `/login`).
- **Admin APIs** expect `Authorization: Bearer <admin_jwt>`.

---

## 3. API Middleware & Responses

- **`middleware/authMiddleware.js`**:
  - `requireAuth(request)`: returns user from JWT or `errorResponse("Authentication required", 401)`.
  - `requireAction(request, action)`: requireAuth + `canPerformAction(user.role, action)` (GET/POST/PUT/PATCH/DELETE rules in `lib/auth.js`).
  - `requireUserManagement(request)`: admin only.
- **`lib/auth.js`**: `getUserFromRequest(request)` validates JWT and ensures user exists in DB (User or Student); returns decoded payload or null. `canPerformAction(role, action)` and `canManageUsers(role)` define who can do what.
- **`utils/apiResponse.js`**: `successResponse(data, message, status)`, `errorResponse(message, status, errors)`, `notFoundResponse()`, `handleApiError(error, customMessage)`.
- **`utils/pagination.js`**: `parsePagination(searchParams)` → `{ page, limit, skip }`; `createPaginationResponse(data, total, page, limit)` → `{ success, data, pagination: { page, limit, total, totalPages, hasNextPage, ... } }`.

---

## 4. Permissions (UI)

- **`app/(admin)/hooks/usePermissions.js`**: Reads `localStorage.user`, normalizes role; returns `{ canCreate, canEdit, canDelete, canReorder, canManageUsers, role }`. viewer: all false; editor: edit, reorder; moderator: create, edit, reorder; super_moderator: + delete; admin: all + manageUsers. `getPermissionMessage(action, role)` returns message when action denied.
- **`app/(admin)/components/common/PermissionButton.jsx`**: Wraps buttons; disables and shows lock + message when user lacks permission for `action` (create | edit | delete | reorder | toggle).

---

## 5. Management Features & Their APIs (concise)

### Notification
- **UI**: `NotificationManagement.jsx` — list (filters: status, hierarchy exam→…→definition), search, inline create/edit form (no modal), RichTextEditor for message, type pills/colors. Table: Level/Path, Title, Message preview, Strip, Status, Created, Actions.
- **APIs**:
  - `GET /api/notification` — list (admin). Query: status, entityType, entityId, page, limit. Auth: requireAuth. Returns paginated list with `hierarchyPath` attached.
  - `POST /api/notification` — create. Body: entityType, entityId, title, message, stripMessage, link, linkLabel, slug, status, iconType, orderNumber. Auth: requireAuth.
  - `GET/PUT/DELETE /api/notification/[id]` — get/update/delete one. Auth: requireAuth.
- **Other**: `GET /api/notification/list` (public list for main app), `GET /api/notification/for-context`, `GET /api/notification/unread-count`, `POST /api/notification/mark-read`, `GET /api/notification/by-slug/[slug]`.

### Exam
- **UI**: `ExamManagement.jsx` — table, add form, edit inline, status/meta filters, reorder. Links to detail: `/admin/exam/[id]` → `ExamDetailPage.jsx` (content in RichTextEditor, SEO in ExamDetails).
- **APIs**:
  - `GET /api/exam` — list. Query: status, metaStatus (filled/notFilled), page, limit. Public for status=active; requireAuth for inactive/all. Returns list with contentInfo; cache for active.
  - `POST /api/exam` — create. requireAction("POST"). Body: name, status, image, description, orderNumber.
  - `GET/PUT/PATCH/DELETE /api/exam/[id]` — get, full update, status(+cascade)/orderNumber, delete. requireAuth for GET; requireAction for others. PATCH cascades status to subject→unit→chapter→topic→subtopic.

### Subject, Unit, Chapter, Topic, SubTopic, Definition
- **Pattern**: List API with `examId` / `subjectId` / … filter, status, pagination, optional metaStatus; detail API by `[id]`; reorder APIs (e.g. `POST /api/chapter/reorder`). Content/SEO often in separate *Details model (e.g. SubjectDetails). Detail pages use RichTextEditor for content.
- **APIs**: Same pattern — `GET/POST /api/subject`, `GET/PUT/PATCH/DELETE /api/subject/[id]`, same for unit, chapter, topic, subtopic, definition. Reorder: e.g. `/api/unit/reorder`, `/api/chapter/reorder`, etc. Auth: requireAuth for GET, requireAction for mutations.

### Overview comments
- **UI**: `OverviewCommentManagement.jsx` — list with hierarchy filter, status (pending/approved/rejected), search, approve/reject/delete.
- **APIs**:
  - `GET /api/overview-comment` — listAll=true + auth → all comments with optional includeHierarchy; else entityType, entityId, status, limit, skip (public).
  - `POST /api/overview-comment` — create (student or anonymous name/email).
  - `GET/PUT/DELETE /api/overview-comment/[id]` — get, update (e.g. status), delete. Admin uses requireAuth.

### Lead
- **UI**: `LeadManagement.jsx` + `LeadTable.jsx`.
- **APIs**: `GET /api/lead` — paginated, filters: country, className, status, search, dateFrom, dateTo. requireAuth. `POST` create, `GET/PUT/DELETE /api/lead/[id]`.

### Blog
- **APIs**: `GET/POST /api/blog`, `GET/PUT/DELETE /api/blog/[id]`, `GET /api/blog/[id]/details`, category and comment routes. Admin uses auth.

### Discussion
- **APIs**: threads, replies, like/report/vote/subscribe under `api/discussion/...`. Admin import/export under `api/admin/discussion/...`.

### Practice (test papers)
- **APIs**: `GET/POST /api/practice/category`, `GET/PUT/.../api/practice/category/[id]`, same for subcategory and question. Status endpoints for publish flow.

### Download
- **APIs**: folder, subfolder, file CRUD under `api/download/...`.

### Form, Student, User/Role
- **APIs**: `api/form`, `api/student`, `api/user`; role management and permissions in `lib/auth.js` and admin config.

### Analytics
- **APIs**: `api/analytics/ip-block`, `api/analytics/check-ip`, etc.

---

## 6. Shared UI & Patterns

- **Toast**: `ToastContainer`, `useToast()` → `success()`, `error()`, `toasts`, `removeToast`.
- **Loading**: `LoadingSpinner`, `SkeletonPageContent`, `LoadingWrapper` from `SkeletonLoader.jsx`.
- **RichTextEditor**: `components/ui/RichTextEditor.jsx` — CKEditor, value/onChange, placeholder, disabled. Used for content/message bodies.
- **Tables**: Feature-specific tables (e.g. `ExamTable`, `LeadTable`) with actions (edit, delete, status) and permission-aware buttons.
- **Hierarchy**: Many entities (notification, overview-comment) use entityType + entityId and attach `hierarchyPath` (Exam → Subject → … → Definition) via populate and helper (e.g. `attachHierarchyPaths`).

---

## 7. Response Shapes (typical)

- **List (paginated)**: `{ success: true, data: [...], pagination: { page, limit, total, totalPages, hasNextPage, ... } }` or wrapped in `utils/apiResponse` style with `data`/`message`/`timestamp`.
- **Single resource**: `{ success: true, data: {...}, message?, timestamp }`.
- **Error**: `{ success: false, message, errors?, timestamp }` with status 4xx/5xx.

---

## 8. Constants & Env

- **constants**: STATUS, ERROR_MESSAGES, PAGINATION (DEFAULT_PAGE, DEFAULT_LIMIT, MIN/MAX_LIMIT), etc.
- **Env**: `NEXT_PUBLIC_BASE_PATH`, `JWT_SECRET` for API auth.

---

Use this reference when implementing or changing admin management flows and APIs. For any specific feature, open the corresponding management component and API route files for exact field names and validation.
