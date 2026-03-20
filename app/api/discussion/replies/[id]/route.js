import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Reply from "@/models/Reply";
import Thread from "@/models/Thread";
import { verifyStudentToken } from "@/lib/studentAuth"; // For student
import { verifyToken } from "@/lib/auth"; // For admin
import { sendMail } from "@/lib/mailer";
import { getEmailTemplateContent } from "@/lib/getEmailTemplateContent";
import { getAuthorEmail } from "@/lib/getAuthorEmail";

// Helper to get user from request
async function getUser(request) {
    // Try admin first
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);
            if (decoded) return { id: decoded.userId || decoded.id, role: decoded.role, type: "User" };
        } catch (e) { /* ignore */ }
    }

    // Try student
    const studentAuth = await verifyStudentToken(request);
    if (!studentAuth.error) {
        return { id: studentAuth.studentId, type: "Student" };
    }
    return null;
}

export async function DELETE(request, { params }) {
    try {
        await connectDB();
        const { id } = await params;
        const user = await getUser(request);

        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const reply = await Reply.findById(id);
        if (!reply) {
            return NextResponse.json({ success: false, message: "Reply not found" }, { status: 404 });
        }

        // Allow deletion if Admin or Author (reply.author is null for Guest replies)
        const isAdmin = user.type === "User";
        const isAuthor = reply.author != null && reply.author.toString() === user.id;

        if (!isAdmin && !isAuthor) {
            return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
        }

        await Reply.findByIdAndDelete(id);
        // Optional: Also delete child replies if nested, for now simple delete

        return NextResponse.json({ success: true, message: "Reply deleted successfully" });
    } catch (error) {
        console.error("Delete reply error:", error);
        return NextResponse.json({ success: false, message: "Failed to delete reply" }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        await connectDB();
        const { id } = await params;
        const user = await getUser(request);

        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const reply = await Reply.findById(id);
        if (!reply) {
            return NextResponse.json({ success: false, message: "Reply not found" }, { status: 404 });
        }

        const body = await request.json();
        const isAdmin = user.type === "User";
        const isAuthor = reply.author && reply.author.toString() === user.id;

        // Preserve isApproved when only editing content so pending indicator is not cleared until approve/delete
        const previousIsApproved = reply.isApproved;
        const justApproved = body.isApproved === true;

        // Admin actions: Approve/Unapprove
        if (body.isApproved !== undefined) {
            if (!isAdmin) {
                return NextResponse.json({ success: false, message: "Only admins can approve replies" }, { status: 403 });
            }
            reply.isApproved = body.isApproved;
        }

        // Admin/Author actions: Edit Content
        if (body.content !== undefined) {
            if (!isAdmin && !isAuthor) {
                return NextResponse.json({ success: false, message: "Only admins and authors can edit replies" }, { status: 403 });
            }
            reply.content = body.content;
            // Content-only update: do not change approval state
            if (body.isApproved === undefined) {
                reply.isApproved = previousIsApproved;
            }
        }

        await reply.save();

        // Notify reply author when reply is approved (Student/User only)
        if (justApproved && reply.authorType !== "Guest") {
            (async () => {
                try {
                    const thread = await Thread.findById(reply.threadId).select("title").lean();
                    const threadTitle = thread?.title || "Discussion";
                    const email = await getAuthorEmail(reply.author, reply.authorType);
                    if (email) {
                        const { subject, text, html } = await getEmailTemplateContent("reply_approved", { thread_title: threadTitle });
                        await sendMail({ to: email, subject, text, html });
                    }
                } catch (err) {
                    console.error("Reply approved email error:", err);
                }
            })();
        }

        return NextResponse.json({
            success: true,
            data: reply,
            message: body.content !== undefined ? "Reply updated successfully" : `Reply ${body.isApproved ? 'approved' : 'unapproved'}`
        });
    } catch (error) {
        console.error("Patch reply error:", error);
        return NextResponse.json({ success: false, message: "Failed to update reply" }, { status: 500 });
    }
}
