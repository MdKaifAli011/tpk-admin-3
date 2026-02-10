# Figma Prototype Protocol — Screen-to-Screen Connections

Use this document to wire **click → next screen** in your Figma prototype. Each screen has an **ID** and a **path**. Connections are listed as: **Trigger (element/action) → Destination screen (path)**.

**Base path:** Admin routes are under `/admin`. Public (self-study) routes use base path `BASE` (e.g. `BASE` = `/self-study` in production). In Figma you can use a variable for `BASE` or hardcode `/self-study`.

---

## 1. Screen index (IDs and paths)

### Admin — Entry & shell
| Screen ID | Path | Description |
|-----------|------|-------------|
| `admin-login` | `/admin/login` | Admin login |
| `admin-register` | `/admin/register` | Admin register |
| `admin-dashboard` | `/admin` | Welcome to Admin Dashboard (home after login) |
| `admin-profile` | `/admin/profile` | Profile settings (sidebar footer) |

### Admin — Page Management (full flow)
| Screen ID | Path | Description |
|-----------|------|-------------|
| `admin-pages-list` | `/admin/pages` | Page Management list (table of pages) |
| `admin-pages-new` | `/admin/pages/new` | Create new site-level page |
| `admin-pages-new-exam` | `/admin/pages/new?exam={examSlug}` | Create new exam-level page (e.g. `?exam=neet`) |
| `admin-pages-edit` | `/admin/pages/{slug}` | Edit page (site-level) |
| `admin-pages-edit-exam` | `/admin/pages/{slug}?exam={examSlug}` | Edit page (exam-level) |
| `admin-pages-delete-modal` | (overlay) | Delete confirmation modal (over `admin-pages-list`) |
| `public-page-site` | `BASE/pages/{slug}` | Public site-level page (e.g. About Us) |
| `public-page-exam` | `BASE/{examSlug}/pages/{slug}` | Public exam-level page (e.g. NEET landing) |

### Admin — Other management (sidebar)
| Screen ID | Path |
|-----------|------|
| `admin-exam` | `/admin/exam` |
| `admin-exam-edit` | `/admin/exam/[id]` |
| `admin-subject` | `/admin/subject` |
| `admin-subject-edit` | `/admin/subject/[id]` |
| `admin-unit` | `/admin/unit` |
| `admin-unit-edit` | `/admin/unit/[id]` |
| `admin-chapter` | `/admin/chapter` |
| `admin-chapter-edit` | `/admin/chapter/[id]` |
| `admin-topic` | `/admin/topic` |
| `admin-topic-edit` | `/admin/topic/[id]` |
| `admin-subtopic` | `/admin/sub-topic` |
| `admin-subtopic-edit` | `/admin/sub-topic/[id]` |
| `admin-definitions` | `/admin/definitions` |
| `admin-definitions-edit` | `/admin/definitions/[id]` |
| `admin-practice` | `/admin/practice` |
| `admin-download` | `/admin/download` |
| `admin-download-subfolder` | `/admin/download/subfolder` |
| `admin-download-file` | `/admin/download/file` |
| `admin-blog` | `/admin/blog` |
| `admin-blog-category` | `/admin/blog-category` |
| `admin-blog-comment` | `/admin/blog-comment` |
| `admin-discussion` | `/admin/discussion` |
| `admin-discussion-banner` | `/admin/discussion/banner` |
| `admin-discussion-import` | `/admin/discussion-import` |
| `admin-analytics-ip` | `/admin/analytics/ip-management` |
| `admin-lead` | `/admin/lead` |
| `admin-student` | `/admin/student` |
| `admin-form` | `/admin/form` |
| `admin-user-role` | `/admin/user-role` |
| `admin-overview-comments` | `/admin/overview-comments` |
| `admin-bulk-import` | `/admin/bulk-import` |
| `admin-seo-import` | `/admin/seo-import` |
| `admin-url-export` | `/admin/url-export` |

---

## 2. Page Management — Protocol (call next page)

Use these mappings to connect Figma frames for the Page Management flow.

### From: `admin-dashboard` (`/admin`)
| Trigger | Destination | Path / note |
|---------|-------------|-------------|
| Sidebar → **Pages** → **Manage Pages** | `admin-pages-list` | `/admin/pages` |
| Quick link card **Page Management** | `admin-pages-list` | `/admin/pages` |

### From: `admin-pages-list` (`/admin/pages`)
| Trigger | Destination | Path / note |
|---------|-------------|-------------|
| Button **Site-level page** | `admin-pages-new` | `/admin/pages/new` |
| Dropdown **Create exam page…** → choose exam | `admin-pages-new-exam` | `/admin/pages/new?exam={examSlug}` (e.g. `neet`) |
| Row: click **page title** | `admin-pages-edit` or `admin-pages-edit-exam` | `/admin/pages/{slug}` or `/admin/pages/{slug}?exam={examSlug}` |
| Row: **Edit** (pencil) | Same as above | Same as above |
| Row: **View** (eye) | `public-page-site` or `public-page-exam` | Opens in **new tab**: `BASE/pages/{slug}` or `BASE/{examSlug}/pages/{slug}` |
| Row (deleted): **Restore** | Same screen (state update) | No navigation; list updates |
| Row: **Delete** (trash) | `admin-pages-delete-modal` | **Overlay** on same screen |
| Empty state: **Create Your First Page** | `admin-pages-new` | `/admin/pages/new` |

### From: `admin-pages-delete-modal` (overlay)
| Trigger | Destination | Path / note |
|---------|-------------|-------------|
| **Cancel** | `admin-pages-list` | Close overlay; stay on `/admin/pages` |
| **Delete** | `admin-pages-list` | Close overlay; stay on `/admin/pages` (list updates, toast) |

### From: `admin-pages-new` (`/admin/pages/new`)
| Trigger | Destination | Path / note |
|---------|-------------|-------------|
| **Back** (browser/back arrow) | Previous screen | e.g. `admin-pages-list` |
| **Create Page** (save) | `admin-pages-edit` | Redirect to `/admin/pages/{newSlug}` |
| **Create & Close** (save) | `admin-pages-list` | `/admin/pages` |

### From: `admin-pages-new-exam` (`/admin/pages/new?exam=…`)
| Trigger | Destination | Path / note |
|---------|-------------|-------------|
| **Back** | Previous screen | e.g. `admin-pages-list` |
| **Create Page** | `admin-pages-edit-exam` | `/admin/pages/{newSlug}?exam={examSlug}` |
| **Create & Close** | `admin-pages-list` | `/admin/pages` |

### From: `admin-pages-edit` or `admin-pages-edit-exam` (`/admin/pages/{slug}` or `?exam=…`)
| Trigger | Destination | Path / note |
|---------|-------------|-------------|
| **Back** | Previous screen | e.g. `admin-pages-list` |
| **View** (eye) | `public-page-site` or `public-page-exam` | **New tab**: `BASE/pages/{slug}` or `BASE/{examSlug}/pages/{slug}` |
| **Save** | Same screen | No navigation; toast |
| **Save & Close** | `admin-pages-list` | `/admin/pages` |

### Public pages (for “View” from admin)
| Screen ID | Path | When used |
|-----------|------|-----------|
| `public-page-site` | `BASE/pages/{slug}` | Site-level page (e.g. About Us) |
| `public-page-exam` | `BASE/{examSlug}/pages/{slug}` | Exam-level page (e.g. NEET landing) |

Use **new tab** for View in prototype if you want to mimic “open in new tab”; otherwise link to the same frame with the public page layout (no sidebar).

---

## 3. Admin sidebar → list screens (all sections)

From any admin screen, sidebar works like this:

| Sidebar item (section → child) | Destination path |
|--------------------------------|-------------------|
| **Self Study** → Exams | `/admin/exam` |
| **Self Study** → Subjects | `/admin/subject` |
| **Self Study** → Units | `/admin/unit` |
| **Self Study** → Chapters | `/admin/chapter` |
| **Self Study** → Topics | `/admin/topic` |
| **Self Study** → Sub Topics | `/admin/sub-topic` |
| **Self Study** → Definitions | `/admin/definitions` |
| **Test Papers** → Exams | `/admin/practice` |
| **Download** → Folder | `/admin/download` |
| **Download** → Sub Folder | `/admin/download/subfolder` |
| **Download** → Files | `/admin/download/file` |
| **Blog** → Posts | `/admin/blog` |
| **Blog** → Categories | `/admin/blog-category` |
| **Blog** → Comments | `/admin/blog-comment` |
| **Pages** → Manage Pages | `/admin/pages` |
| **Discussion** → Threads | `/admin/discussion` |
| **Discussion** → Banner Upload | `/admin/discussion/banner` |
| **Discussion** → Import/Export | `/admin/discussion-import` |
| **Analytics** → IP Management | `/admin/analytics/ip-management` |
| **Admin** → Lead Management | `/admin/lead` |
| **Admin** → Students | `/admin/student` |
| **Admin** → Forms | `/admin/form` |
| **Admin** → Role Management | `/admin/user-role` |
| **Admin** → Overview Comments | `/admin/overview-comments` |
| **Admin** → Import Self Study Data | `/admin/bulk-import` |
| **Admin** → Meta Import | `/admin/seo-import` |
| **Admin** → URL Export | `/admin/url-export` |
| **Profile Settings** (footer) | `/admin/profile` |

---

## 4. Dashboard quick links → list screens

Each quick link card on `admin-dashboard` goes to the same path as the sidebar child:

- Exam Management → `/admin/exam`
- Subject Management → `/admin/subject`
- Unit Management → `/admin/unit`
- Chapter Management → `/admin/chapter`
- Topic Management → `/admin/topic`
- Sub Topic Management → `/admin/sub-topic`
- Discussion Management → `/admin/discussion`
- Banner Upload → `/admin/discussion/banner`
- Page Management → `/admin/pages`

---

## 5. Implementation checklist for Figma

1. **Frames:** Create one frame per Screen ID (e.g. `admin-pages-list`, `admin-pages-edit`).
2. **Overlays:** Use a component or frame for `admin-pages-delete-modal` and show it as overlay on top of `admin-pages-list`.
3. **Connections:** For each row in Section 2, add a prototype link: **Trigger** → **Destination frame** (same as “Destination” column).
4. **Variables:** Use `BASE` = `/self-study` for public page URLs; use `{slug}` and `{examSlug}` as placeholders (e.g. `about-us`, `neet`) in your prototype paths if your tool supports them.
5. **New tab:** For “View” (eye), either link to a separate “Public page” frame or use “Open link in new tab” if your tool supports it.

This protocol matches the app’s routing so your Figma prototype and implementation stay in sync.
