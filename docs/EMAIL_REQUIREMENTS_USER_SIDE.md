 implemented | implemented | implemented (no checkout API yet) | implemented |# Email Requirements – User Side (Main App)

This document lists **all user-facing flows** in the **(main)** app that either **already send email** or **could/should send email**. It is based on a deep read of `app/(main)`, related API routes, and the existing mailer setup.

See also: **[When / where we send email TO the student](#when--where-we-send-email-to-the-student)** (dedicated list below).

---

## When / where we send email TO the student

All scenarios where the **student** (or logged-in user / lead) should receive an email. Implemented items are marked below.

| # | When / where | Trigger (API or action) | Email to student | Status |
|---|--------------|--------------------------|------------------|--------|
| 1 | **After student registration** | `POST /api/student/auth/register` | Welcome email: “Your account is created”, login link, quick start. | **Implemented** |
| 2 | **Email verification** (if you add it) | Student clicks “Verify email” or after register | Verification link or “Your email is verified”. | Not implemented |
| 3 | **Contact / inquiry submitted** | User submits contact form → `POST /api/lead` | Auto-reply: “We received your message. We’ll get back to you soon.” | **Implemented** |
| 4 | **Download request** | User enters email in Download modal → `POST /api/lead` | “We received your download request” and/or download link. | **Implemented** |
| 5 | **Trial / demo request** | User submits Trial modal → `POST /api/lead` | “We received your trial request. Our team will contact you.” | **Implemented** |
| 6 | **Counselor / consultation request** | User submits Counselor modal → `POST /api/lead` | “We received your request. A counselor will contact you at [email].” | **Implemented** |
| 7 | **Course contact form** | User submits course contact → `POST /api/lead` | Same as contact: “We received your request.” | **Implemented** |
| 8 | **Generic form (FormRenderer)** | User submits any public form → `POST /api/lead` | Optional auto-reply: “Thank you for submitting.” | **Implemented** |
| 9 | **Discussion: thread created** | Student/guest creates thread → `POST /api/discussion/threads` | “Your thread was posted” (or “pending moderation”). | **Implemented** |
| 10 | **Discussion: thread approved** | Admin approves pending thread | “Your thread is now live.” [to thread author] | **Implemented** |
| 11 | **Discussion: new reply on their thread** | Someone replies → `POST /api/discussion/replies` | “Someone replied to your thread: [title]” + link. [to thread author] | **Implemented** |
| 12 | **Discussion: new reply (subscribers)** | Someone replies on a thread they subscribed to | “New reply on a thread you follow” + link. [to subscribers] | **Implemented** |
| 13 | **Discussion: their reply approved** | Admin approves pending reply | “Your reply was approved and is now visible.” [to reply author] | **Implemented** |
| 14 | **Blog: comment submitted** | Student/guest posts comment → `POST /api/blog/[id]/comment` | “Your comment was received and is pending moderation.” (optional) | **Implemented** |
| 15 | **Overview comment submitted** | User posts comment on self-study page → `POST /api/overview-comment` | Optional: “Thank you for your comment. It will be reviewed.” | **Implemented** |
| 16 | **Practice / test result** | Student submits test → `POST /api/student/test-results` | Result summary: score, correct/incorrect, link to review. | **Implemented** |
| 17 | **Store order confirmation** | Student completes checkout (when implemented) | “Order confirmed” + order details, next steps. | Not implemented (no checkout API yet) |
| 18 | **Important notification** | Admin creates a notification → `POST /api/notification` | Optional: “New announcement: [title]” with link to notification. | Not implemented |
| 19 | **Login / security** (optional) | First-time login or new device | “New login to your account” (optional). | Not implemented |
| 20 | **Password reset** (if you add it) | User requests reset | Reset link with expiry. | Not implemented |

**Summary:**  
- **To student (or lead) email:** 1–8 (registration + all lead/form submissions), 9–15 (discussion + comments), 16 (test result), 17 (order), 18–20 (notifications / account).  
- **Implement in:** the API route that handles the action (e.g. after `Student.create`, after `Lead.create`, after `Reply.create`, etc.), using `sendMail({ to: student.email, ... })` and templates you define.

---

## Currently Sending Email (Implemented)

| # | Feature | Who triggers | API / flow | Email sent |
|---|--------|--------------|------------|------------|
| 1 | **Lead export (admin)** | Admin exports leads to CSV and chooses “Send email” | `POST /api/lead/send-export` | CSV attached and sent to **Lead export email** (configured in Admin → Email & Notifications). |

| 2 | **Lead auto-reply** | User submits any form that POSTs to `/api/lead` | `POST /api/lead` | Auto-reply to submitter: "We received your request" (optionally includes form_id/form_name). |
| 3 | **Student welcome** | Student completes registration | `POST /api/student/auth/register` | Welcome email to student. |
| 4 | **Discussion thread created** | Student/User creates thread | `POST /api/discussion/threads` | Confirmation to author (live or pending moderation). |
| 5 | **Discussion thread approved** | Admin approves thread | `PATCH /api/discussion/threads/[slug]` (isApproved: true) | "Your thread is now live" to thread author. |
| 6 | **Discussion new reply** | Someone posts reply | `POST /api/discussion/replies` | "Someone replied to your thread" to thread author; "New reply on a thread you follow" to subscribers. |
| 7 | **Discussion reply approved** | Admin approves reply | `PATCH /api/discussion/replies/[id]` (isApproved: true) | "Your reply was approved" to reply author. |
| 8 | **Blog comment received** | User posts blog comment | `POST /api/blog/[id]/comment` | "Your comment was received and is pending moderation" to commenter. |
| 9 | **Overview comment received** | User posts overview comment | `POST /api/overview-comment` | "Thank you for your comment. It will be reviewed." to commenter. |
| 10 | **Test result summary** | Student submits test | `POST /api/student/test-results` | Result summary (score, percentage) to student. |

---

## User-Side Flows – Where Email Could Be Used

Below: **user-side** flows (or flows triggered by user actions), the **API** involved, the **(main) UI** that triggers it, and **suggested email use**.

---

### 1. Registration & account

| Flow | API | Main app location | Suggested email |
|------|-----|-------------------|------------------|
| **Admin register** | `POST /api/auth/register` | `app/(main)/register/page.js` (admin code) | Welcome email to new admin. |
| **Student register** | `POST /api/student/auth/register` | `TestSubmissionRegistrationModal.jsx`, `DiscussionForumSavePostModal.jsx`, and any form that calls student register | Welcome email; optional verification email. |

**Notes:**  
- Admin register: `app/api/auth/register/route.js` – creates User, returns JWT; no email.  
- Student register: `app/api/student/auth/register/route.js` – creates Student + Lead; no email.

---

### 2. Discussion (forums)

| Flow | API | Main app location | Suggested email |
|------|-----|-------------------|------------------|
| **Create thread** | `POST /api/discussion/threads` | Discussion form (e.g. `DiscussionFormModal.jsx` submits lead first; thread creation may be separate) | Optional: confirm to author “Your thread was posted (pending approval if applicable)”. |
| **Post reply** | `POST /api/discussion/replies` | Reply form on thread page | Notify **thread author** and/or **subscribers** when a new reply is posted (and optionally when reply is approved if moderated). |
| **Thread approval** (admin) | Admin approves pending thread | — | Notify thread author: “Your thread is now live.” |
| **Reply approval** (admin) | Admin approves pending reply | — | Notify reply author and/or thread author. |
| **Subscribe to thread** | `POST /api/discussion/threads/[slug]/subscribe` | Thread page subscribe button | Subscribers are stored; email them when a **new reply** is added (or approved). |

**Notes:**  
- Threads: `app/api/discussion/threads/route.js` (POST creates thread).  
- Replies: `app/api/discussion/replies/route.js` (POST creates reply; student/guest replies can be `isApproved: false`).  
- Subscribe: `app/api/discussion/threads/[slug]/subscribe/route.js` – toggles subscription; no email on subscribe.

---

### 3. Comments (blog & overview)

| Flow | API | Main app location | Suggested email |
|------|-----|-------------------|------------------|
| **Blog comment** | `POST /api/blog/[id]/comment` | `app/(main)/[exam]/blog/[slug]/BlogComments.jsx` | Notify **blog post author** or **admin** on new comment; optional “Your comment is pending moderation” to commenter. |
| **Overview comment** (self-study pages) | `POST /api/overview-comment` | `app/(main)/components/OverviewCommentSection.jsx` | Notify **admin** (e.g. to lead-export or a dedicated “comments” inbox) for moderation; optional auto-reply to commenter. |

**Notes:**  
- Blog: `app/api/blog/[id]/comment/route.js` – creates comment (status `pending` for moderation).  
- Overview: `app/api/overview-comment/route.js` – creates OverviewComment (status `pending`).

---

### 4. Leads, contact forms & form submissions

All of these currently **POST to `/api/lead`** (create or update lead). **No email is sent** to the user or to admin.

| Flow | API | Main app location | Suggested email |
|------|-----|-------------------|------------------|
| **Contact form** | `POST /api/lead` | `app/(main)/components/ContactForm.jsx` | Auto-reply to user: “We received your message”; optional: notify admin/sales (e.g. lead-export or contact inbox). |
| **Download modal** (user enters email to get file) | `POST /api/lead` | `app/(main)/components/DownloadModal.jsx` | Confirm to user: “Your download request was received” and/or send download link if applicable. |
| **Trial / demo request** | `POST /api/lead` | `app/(main)/components/TrialModal.jsx` | Same as contact: auto-reply + optional admin notify. |
| **Counselor / consultation request** | `POST /api/lead` | `app/(main)/components/CounselorModal.jsx` | Same as contact; optional: “A counselor will contact you at [email].” |
| **Course contact form** | `POST /api/lead` | `app/(main)/[exam]/course/[slug]/page.js` (contact section) | Same as contact. |
| **Discussion form** (lead capture before action) | `POST /api/lead` | `app/(main)/components/DiscussionFormModal.jsx` | Optional auto-reply. |
| **Generic form (FormRenderer)** | `POST /api/lead` | `app/(main)/components/forms/FormRenderer.jsx` | Optional: auto-reply and/or notify admin by form_id. |

**Notes:**  
- Lead API: `app/api/lead/route.js` – POST creates or updates Lead; no `sendMail` call.  
- Admin already gets lead data via **Lead export email** when they export; **new lead notification** (instant email on each new/updated lead) is a separate feature you may want.

---

### 5. Store checkout

| Flow | API | Main app location | Suggested email |
|------|-----|-------------------|------------------|
| **Order / checkout** | None (client-only for now) | `app/(main)/store/checkout/page.js` | UI says: “A confirmation will be sent to your email” – **no backend or email implemented**. When checkout is implemented: **order confirmation email** to customer (and optionally to admin/sales). |

**Notes:**  
- Checkout page only sets local state and shows success message; no `api.post` for order.  
- Store/checkout API and payment flow need to be implemented; then add order confirmation email.

---

### 6. Practice / test

| Flow | API | Main app location | Suggested email |
|------|-----|-------------------|------------------|
| **Test result submitted** | `POST /api/student/test-results` | Practice/test submission UI (student) | Optional: send **result summary** to student email (score, correct/incorrect, link to review). |

**Notes:**  
- `app/api/student/test-results/route.js` – POST saves `StudentTestResult`; no email.

---

### 7. Notifications (in-app)

| Flow | API | Main app location | Suggested email |
|------|-----|-------------------|------------------|
| **Admin creates notification** | `POST /api/notification` | Admin panel | Optional: **email digest** or single email to students (or to a segment) when an important notification is created; or “New announcement” with link. |

**Notes:**  
- `app/api/notification/route.js` – POST creates Notification (admin only); no email to users.  
- Notifications are shown in-app; email is an optional channel.

---

### 8. Other (reference)

| Flow | API | Note |
|------|-----|------|
| **Admin test email** | `POST /api/admin/email-settings` | Already implemented: sends a test email to verify SMTP. |
| **Login** | `POST /api/auth/login`, `POST /api/student/auth/login` | Optional: “New login” or “Password reset” emails – not implemented. |

---

## Summary Table – “Where email is needed”

| Category | Flow | Email currently? | Suggested |
|----------|------|------------------|-----------|
| Admin | Lead export | Yes | Keep (already done). |
| Admin | Test SMTP | Yes | Keep (already done). |
| Registration | Admin register | No | Welcome email. |
| Registration | Student register | No | Welcome + optional verification. |
| Discussion | New thread | No | Optional confirmation to author. |
| Discussion | New reply | No | Notify thread author + subscribers. |
| Discussion | Thread/Reply approved | No | Notify author. |
| Comments | Blog comment | No | Notify post author or admin; optional to commenter. |
| Comments | Overview comment | No | Notify admin; optional to commenter. |
| Leads/Forms | Contact, Download, Trial, Counselor, Course contact, FormRenderer | No | Auto-reply to user; optional new-lead email to admin. |
| Store | Checkout / order | No | Order confirmation (when checkout exists). |
| Practice | Test result submitted | No | Optional result summary to student. |
| Notifications | Admin creates notification | No | Optional email to users for important announcements. |

---

## Implementation notes

- **Mailer:** `lib/mailer.js` (uses `getEmailSettings()` from `lib/getEmailSettings.js`).  
- **Config:** Admin → **Email & Notifications** (`/admin/email-settings`) for SMTP and **Lead export email**.  
- **Recipients:** For new flows you may want to add more recipient settings (e.g. “Contact form notifications to”, “Discussion reply notifications”, “New comment notifications”) in the same Email Settings model or in a separate “Notification recipients” section.  
- **Sending TO the student:** Use the student’s or lead’s email: `Student.email`, `Lead.email`, or the `email` from the request body (e.g. contact/download/trial forms). Always validate and sanitize; use a single “From” address from Email Settings.
- **Templates:** No email templates exist yet; each new email type will need subject/body (and optionally HTML) in code or in a template store.

---

*Generated from a deep read of `app/(main)`, `app/api`, and existing email/mailer usage.*
