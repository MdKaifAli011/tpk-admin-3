## Form modals (main) – image usage

Form modals use the util `getFormPlaceholderImageSrc(pathname, basePath, options)` from `app/(main)/components/utils/formPlaceholderImage.js`. Images are resolved from the current URL (first segment = exam slug).

### Image path logic

**Default variant** (all modals except Discussion):

- On exam route: ``${basePath}/images/${examSlug}-form-placeholder.png`` (e.g. `jee-form-placeholder.png`, `neet-form-placeholder.png`).
- Fallback: ``${basePath}/images/form-placeholder.png``

**Discussion variant** (`DiscussionFormModal`, `DiscussionForumSavePostModal`):

- On exam route: ``${basePath}/images/${examSlug}-Discussion-form-placeholder.png``  
  Examples: `jee-Discussion-form-placeholder.png`, `neet-Discussion-form-placeholder.png`, `ap-Discussion-form-placeholder.png`.
- Fallback: ``${basePath}/images/form-placeholder.png``

### Modals and image type

| Modal | Variant | Image filename pattern |
|-------|---------|------------------------|
| CommentFormModal | default | `jee-form-placeholder.png`, … |
| DiscussionFormModal | **discussion** | `jee-Discussion-form-placeholder.png`, … |
| DiscussionForumSavePostModal | **discussion** | `jee-Discussion-form-placeholder.png`, … |
| TestSubmissionRegistrationModal | default | `jee-form-placeholder.png`, … |
| DownloadModal | default | `jee-form-placeholder.png`, … |
| CounselorModal | default | `jee-form-placeholder.png`, … |
| TrialModal | default | `jee-form-placeholder.png`, … |

### Assets to provide in `public/images/`

- **Default:** `form-placeholder.png`, `jee-form-placeholder.png`, `neet-form-placeholder.png`, `sat-form-placeholder.png`, `ap-form-placeholder.png`, `ib-form-placeholder.png`, etc.
- **Discussion:** `jee-Discussion-form-placeholder.png`, `neet-Discussion-form-placeholder.png`, `ap-Discussion-form-placeholder.png`, etc.

With `basePath: "/self-study"`, URLs are `/self-study/images/...`. Ensure `NEXT_PUBLIC_BASE_PATH` is set (e.g. `/self-study`) if you use env-based base path.

