import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Reply from "@/models/Reply";
import Thread from "@/models/Thread";
import { verifyStudentToken } from "@/lib/studentAuth";
import { sendMail } from "@/lib/mailer";
import { getEmailTemplateContent } from "@/lib/getEmailTemplateContent";
import { getAuthorEmail, getSubscriberEmails } from "@/lib/getAuthorEmail";

// Helper to get user
async function getUser(request) {
    // 1. Try Admin first
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const { verifyToken } = await import("@/lib/auth");
        try {
            const decoded = verifyToken(token);
            if (decoded) return { id: decoded.userId || decoded.id, type: "User" };
        } catch (e) { /* ignore */ }
    }

    // 2. Try student
    const { verifyStudentToken } = await import("@/lib/studentAuth");
    const studentAuth = await verifyStudentToken(request);
    if (!studentAuth.error) return { id: studentAuth.studentId, type: "Student" };

    // 3. Try Guest
    const guestId = request.headers.get("x-guest-id");
    const guestName = request.headers.get("x-guest-name");
    if (guestId) return { id: guestId, name: guestName || "Guest", type: "Guest" };

    return null;
}

export async function POST(request) {
    try {
        const user = await getUser(request);
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await request.json();
        const { threadId, content, parentReplyId } = body;

        if (!threadId || !content) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        const reply = await Reply.create({
            threadId,
            content,
            parentReplyId: parentReplyId || null,
            author: user.type === "Guest" ? null : user.id,
            authorType: user.type,
            guestName: user.type === "Guest" ? user.name : user.type === "User" ? "TestprepKart" : undefined,
            isApproved: user.type === "User", // Only Admin/User replies are auto-approved, Students and Guests need approval
        });

        // Notify thread author and subscribers (fire-and-forget)
        (async () => {
            try {
                const thread = await Thread.findById(threadId).select("title slug author authorType subscribers").lean();
                if (!thread) return;
                const replyAuthorEmail = user.type === "Guest" ? null : await getAuthorEmail(reply.author, reply.authorType);
                const authorEmail = await getAuthorEmail(thread.author, thread.authorType);
                const subEmails = await getSubscriberEmails(thread.subscribers || []);
                const toSend = new Set([authorEmail, ...subEmails].filter(Boolean));
                toSend.delete(replyAuthorEmail);
                const vars = { thread_title: thread.title, thread_slug: thread.slug };
                const [contentAuthor, contentSub] = await Promise.all([
                    getEmailTemplateContent("new_reply_author", vars),
                    getEmailTemplateContent("new_reply_subscriber", vars),
                ]);
                for (const email of toSend) {
                    const isThreadAuthor = email === authorEmail;
                    const { subject, text, html } = isThreadAuthor ? contentAuthor : contentSub;
                    await sendMail({ to: email, subject, text, html });
                }
            } catch (err) {
                console.error("New reply notification email error:", err);
            }
        })();

        return NextResponse.json({
            success: true,
            data: reply,
            message: "Reply posted successfully"
        });

    } catch (error) {
        console.error("Error posting reply:", error);
        return NextResponse.json(
            { success: false, message: "Failed to post reply" },
            { status: 500 }
        );
    }
}
