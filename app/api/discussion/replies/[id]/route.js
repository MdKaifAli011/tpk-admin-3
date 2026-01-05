
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Reply from "@/models/Reply";
import { verifyStudentToken } from "@/lib/studentAuth"; // For student
import { verifyToken } from "@/lib/auth"; // For admin

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

        // Allow deletion if Admin or Author
        const isAdmin = user.type === "User";
        const isAuthor = reply.author.toString() === user.id;

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
        }

        await reply.save();

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
