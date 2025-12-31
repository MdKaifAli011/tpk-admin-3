
import mongoose from "mongoose";
import "./Guest"; // Ensure Guest model is registered for population

const replySchema = new mongoose.Schema(
    {
        threadId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Thread",
            required: true,
            index: true,
        },
        content: {
            type: String,
            required: [true, "Content is required"],
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'authorType'
        },
        authorType: {
            type: String,
            required: true,
            enum: ["Student", "User", "Guest"],
        },
        guestName: {
            type: String,
            trim: true,
        },
        parentReplyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Reply",
            default: null, // If null, it's a top-level answer. If set, it's a nested comment.
            index: true,
        },
        upvotes: [{
            type: String,
            index: true,
        }],
        downvotes: [{
            type: String,
            index: true,
        }],
        isAccepted: {
            type: Boolean,
            default: false,
        },
        reports: [{
            reporterId: { type: String, required: true },
            reason: { type: String },
            createdAt: { type: Date, default: Date.now }
        }],
        isApproved: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Post-save hook to update thread's lastActivityAt and replyCount
replySchema.post("save", async function (doc) {
    try {
        const Thread = mongoose.model("Thread");
        await Thread.findByIdAndUpdate(doc.threadId, {
            $inc: { replyCount: 1 },
            lastActivityAt: new Date(),
        });
    } catch (error) {
        console.error("Error updating thread stats:", error);
    }
});

const Reply = mongoose.models.Reply || mongoose.model("Reply", replySchema);

export default Reply;
