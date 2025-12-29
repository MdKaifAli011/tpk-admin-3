
import mongoose from "mongoose";

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
            // Could be Student or User (Admin)
            required: true,
            refPath: 'authorType'
        },
        authorType: {
            type: String,
            required: true,
            enum: ["Student", "User"],
        },
        parentReplyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Reply",
            default: null, // If null, it's a top-level answer. If set, it's a nested comment.
            index: true,
        },
        upvotes: [{
            type: mongoose.Schema.Types.ObjectId,
        }],
        isAccepted: {
            type: Boolean,
            default: false,
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
