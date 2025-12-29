
import mongoose from "mongoose";
import slugify from "slugify";

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
            unique: true,
        },
        content: {
            type: String,
            required: [true, "Content is required"],
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student", // Primarily students, but admins could post too. Ideally a polymorphic ref or just check ID.
            required: true,
        },
        authorType: {
            type: String,
            enum: ["Student", "User"], // Student or Admin (User)
            default: "Student",
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
            type: mongoose.Schema.Types.ObjectId,
            // Store IDs of users/students who upvoted
        }],
        isPinned: {
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
        lastActivityAt: {
            type: Date,
            default: Date.now,
        }
    },
    { timestamps: true }
);

// Pre-save hook to generate slug
threadSchema.pre("save", async function (next) {
    if (!this.isModified("title")) return next();

    let slug = slugify(this.title, { lower: true, strict: true });

    // Ensure uniqueness
    const slugRegEx = new RegExp(`^${slug}(-[0-9]*)?$`, "i");
    const threadsWithSlug = await this.constructor.find({ slug: slugRegEx });

    if (threadsWithSlug.length > 0) {
        slug = `${slug}-${threadsWithSlug.length + 1}`;
    }

    this.slug = slug;
    next();
});

const Thread = mongoose.models.Thread || mongoose.model("Thread", threadSchema);

export default Thread;
