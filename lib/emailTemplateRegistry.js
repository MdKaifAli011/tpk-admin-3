/**
 * Registry of all email template keys with display names, descriptions, and placeholders.
 * Used by admin UI and by getEmailTemplateContent for defaults.
 */
export const EMAIL_TEMPLATE_KEYS = [
  "lead_auto_reply",
  "student_welcome",
  "student_forgot_password",
  "thread_created",
  "thread_approved",
  "new_reply_author",
  "new_reply_subscriber",
  "reply_approved",
  "blog_comment_received",
  "overview_comment_received",
  "test_result_summary",
];

export const EMAIL_TEMPLATE_META = {
  lead_auto_reply: {
    name: "Lead / Form auto-reply",
    description: "Sent when a user submits any lead form (contact, download, trial, counselor, etc.).",
    placeholders: ["{{form_name}}"],
    order: 1,
  },
  student_welcome: {
    name: "Student welcome",
    description: "Sent after student registration.",
    placeholders: ["{{name}}"],
    order: 2,
  },
  student_forgot_password: {
    name: "Student forgot password",
    description: "Sent when a student requests a password reset. Contains the reset link.",
    placeholders: ["{{name}}", "{{reset_url}}"],
    order: 3,
  },
  thread_created: {
    name: "Discussion – thread created",
    description: "Confirmation to the author when they create a thread (live or pending moderation).",
    placeholders: ["{{thread_title}}", "{{is_pending}}"],
    order: 4,
  },
  thread_approved: {
    name: "Discussion – thread approved",
    description: "Sent to the thread author when an admin approves their thread.",
    placeholders: ["{{thread_title}}", "{{thread_url}}"],
    order: 5,
  },
  new_reply_author: {
    name: "Discussion – new reply (thread author)",
    description: "Sent to the thread author when someone replies to their thread.",
    placeholders: ["{{thread_title}}", "{{thread_url}}"],
    order: 6,
  },
  new_reply_subscriber: {
    name: "Discussion – new reply (subscriber)",
    description: "Sent to thread subscribers when there is a new reply.",
    placeholders: ["{{thread_title}}", "{{thread_url}}"],
    order: 7,
  },
  reply_approved: {
    name: "Discussion – reply approved",
    description: "Sent to the reply author when an admin approves their reply.",
    placeholders: ["{{thread_title}}"],
    order: 8,
  },
  blog_comment_received: {
    name: "Blog comment received",
    description: "Confirmation to the commenter when they post a blog comment.",
    placeholders: [],
    order: 9,
  },
  overview_comment_received: {
    name: "Overview comment received",
    description: "Confirmation to the commenter when they post an overview/self-study comment.",
    placeholders: [],
    order: 10,
  },
  test_result_summary: {
    name: "Test result summary",
    description: "Sent to the student after they submit a practice test.",
    placeholders: ["{{test_name}}", "{{percentage}}", "{{correct_count}}", "{{total_questions}}", "{{view_url}}"],
    order: 11,
  },
};
