
import mongoose from "mongoose";
import slugify from "slugify";
import "./Guest"; // Ensure Guest model is registered for population

const threadSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            maxlength: [200, "Title cannot exceed 200 characters"],
        },
        slug: {
            type: String,
            required: false, // set by pre-save hook from title; validation runs before hooks so slug cannot be required
        },
        content: {
            type: String,
            required: [true, "Content is required"],
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "authorType",
        },
        authorType: {
            type: String,
            enum: ["Student", "User", "Guest"], // Student, Admin (User), or Anonymous Guest
            default: "Student",
        },
        guestName: {
            type: String,
            trim: true,
        },
        /** When set (e.g. "TestPrepKart" for admin-created threads), show this instead of author/guest on frontend with brand logo */
        contributorDisplayName: {
            type: String,
            trim: true,
        },
        tags: {
            type: [String],
            enum: ["General", "Question", "Urgent", "Notes", "Exam"],
            default: ["General"],
        },
        // Hierarchy linkage - Sparse indexing allows efficient querying at any level
        examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", index: true },
        subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", index: true },
        unitId: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", index: true },
        chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter", index: true },
        topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", index: true },
        subTopicId: { type: mongoose.Schema.Types.ObjectId, ref: "SubTopic", index: true },
        definitionId: { type: mongoose.Schema.Types.ObjectId, ref: "Definition", index: true },

        views: {
            type: Number,
            default: 0,
        },
        upvotes: [{
            type: String,
            index: true,
        }],
        downvotes: [{
            type: String,
            index: true,
        }],
        isPinned: {
            type: Boolean,
            default: false,
        },
        isLocked: {
            type: Boolean,
            default: false,
        },
        isSolved: {
            type: Boolean,
            default: false,
        },
        replyCount: {
            type: Number,
            default: 0,
        },
        attachments: [{
            name: { type: String, required: true },
            size: { type: String },
            url: { type: String, required: true },
            type: { type: String, default: "Resource File" }
        }],
        subscribers: [{
            type: String, // userId or guestId
            index: true,
        }],
        reports: [{
            reporterId: { type: String, required: true },
            reason: { type: String },
            createdAt: { type: Date, default: Date.now }
        }],
        lastActivityAt: {
            type: Date,
            default: Date.now,
        },
        isApproved: {
            type: Boolean,
            default: true,
        }
    },
    { timestamps: true }
);

// Slug is unique per hierarchy (exam, subject, unit, chapter, topic, subtopic, definition)
// Same title e.g. "testing1" can exist under exam1, exam2, exam1/subject1, etc.
threadSchema.index(
    { examId: 1, subjectId: 1, unitId: 1, chapterId: 1, topicId: 1, subTopicId: 1, definitionId: 1, slug: 1 },
    { unique: true }
);

// Pre-save hook: generate slug from title, unique within same hierarchy
threadSchema.pre("save", async function (next) {
    if (!this.slug && !this.title) return next();
    if (this.slug && !this.isModified("title")) return next(); // already have slug and title unchanged

    let slug = slugify(this.title || "thread", { lower: true, strict: true });
    if (!slug) slug = "thread";

    const hierarchyFilter = {
        examId: this.examId || null,
        subjectId: this.subjectId || null,
        unitId: this.unitId || null,
        chapterId: this.chapterId || null,
        topicId: this.topicId || null,
        subTopicId: this.subTopicId || null,
        definitionId: this.definitionId || null,
    };

    const slugRegEx = new RegExp(`^${slug.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}(-[0-9]*)?$`, "i");
    const query = { ...hierarchyFilter, slug: slugRegEx };
    if (this._id) query._id = { $ne: this._id }; // exclude self when updating title
    const existing = await this.constructor.find(query);

    if (existing.length > 0) {
        slug = `${slug}-${existing.length + 1}`;
    }

    this.slug = slug;
    next();
});

const Thread = mongoose.models.Thread || mongoose.model("Thread", threadSchema);

export default Thread;
