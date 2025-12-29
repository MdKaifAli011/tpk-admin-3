
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Thread from "@/models/Thread";
import Reply from "@/models/Reply";
import Student from "@/models/Student"; // Populate 

export async function GET(request, { params }) {
    try {
        await connectDB();
        const { slug } = await params;

        // 1. Fetch Thread
        const thread = await Thread.findOne({ slug })
            .populate("author", "firstName lastName avatar role")
            .lean();

        if (!thread) {
            return NextResponse.json(
                { success: false, message: "Thread not found" },
                { status: 404 }
            );
        }

        // Increment views (Non-blocking)
        // We don't await this to speed up response, or use findOneAndUpdate
        Thread.updateOne({ _id: thread._id }, { $inc: { views: 1 } }).exec();

        // 2. Fetch Replies (Hierarchy)
        // We fetch all replies for this thread
        const replies = await Reply.find({ threadId: thread._id })
            .sort({ isAccepted: -1, upvotes: -1, createdAt: 1 }) // Accepted first, then upvotes, then oldest first
            .populate("author", "firstName lastName avatar role")
            .lean();

        // Transform replies into a tree structure if needed, or just return list and let frontend handle it.
        // Frontend (DiscussionDetail) will likely handle nesting visual.

        return NextResponse.json({
            success: true,
            data: {
                thread,
                replies
            }
        });

    } catch (error) {
        console.error("Error fetching thread detail:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch thread" },
            { status: 500 }
        );
    }
}
