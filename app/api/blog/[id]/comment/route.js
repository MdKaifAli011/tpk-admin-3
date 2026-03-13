import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import BlogComment from "@/models/BlogComment";
import Blog from "@/models/Blog";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { verifyStudentToken } from "@/lib/studentAuth";
import { sendMail } from "@/lib/mailer";
import { getEmailTemplateContent } from "@/lib/getEmailTemplateContent";

// GET: Fetch comments for a blog (public access for approved comments)
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params; // blogId
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "approved"; // Default to approved for public

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid blog ID", 400);
    }

    // Verify blog exists
    const blog = await Blog.findById(id);
    if (!blog) {
      return errorResponse("Blog not found", 404);
    }

    // Build query
    const query = { blogId: id };
    if (status !== "all") {
      query.status = status;
    }

    // Fetch comments with student info (if available)
    const comments = await BlogComment.find(query)
      .populate("studentId", "firstName lastName email")
      .sort({ createdAt: -1 }) // Newest first
      .lean();

    // Format comments to include name and email for anonymous comments
    const formattedComments = comments.map((comment) => {
      if (comment.studentId) {
        // Authenticated student comment
        return comment;
      } else {
        // Anonymous comment - use name and email from comment
        return {
          ...comment,
          studentId: null,
          anonymousName: comment.name,
          anonymousEmail: comment.email,
        };
      }
    });

    return successResponse(formattedComments);
  } catch (error) {
    return handleApiError(error, "Failed to fetch comments");
  }
}

// POST: Create a new comment (supports both authenticated and anonymous users)
export async function POST(request, { params }) {
  try {
    await connectDB();
    const { id } = await params; // blogId
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid blog ID", 400);
    }

    // Verify blog exists
    const blog = await Blog.findById(id);
    if (!blog) {
      return errorResponse("Blog not found", 404);
    }

    // Validate comment
    const { comment, name, email } = body;
    if (!comment || !comment.trim()) {
      return errorResponse("Comment is required", 400);
    }

    if (comment.trim().length > 2000) {
      return errorResponse("Comment cannot exceed 2000 characters", 400);
    }

    // Check if user is authenticated (student)
    const authCheck = await verifyStudentToken(request);
    let studentId = null;
    let commentName = null;
    let commentEmail = null;

    if (!authCheck.error && authCheck.studentId) {
      // Authenticated student
      studentId = authCheck.studentId;
    } else {
      // Anonymous user - require name and email
      if (!name || !name.trim()) {
        return errorResponse("Name is required for anonymous comments", 400);
      }
      if (!email || !email.trim()) {
        return errorResponse("Email is required for anonymous comments", 400);
      }

      // Validate email format
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email.trim())) {
        return errorResponse("Please provide a valid email address", 400);
      }

      // Validate name
      if (name.trim().length < 2) {
        return errorResponse("Name must be at least 2 characters", 400);
      }
      if (name.trim().length > 100) {
        return errorResponse("Name cannot exceed 100 characters", 400);
      }

      commentName = name.trim();
      commentEmail = email.trim().toLowerCase();
    }

    // Get IP address (optional)
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "";

    // Create comment (status defaults to "pending" for moderation)
    const commentData = {
      blogId: id,
      comment: comment.trim(),
      status: "pending", // Requires admin approval
      ipAddress: ipAddress || undefined,
    };

    if (studentId) {
      commentData.studentId = studentId;
    } else {
      commentData.name = commentName;
      commentData.email = commentEmail;
    }

    const newComment = await BlogComment.create(commentData);

    // Populate student info if available
    if (studentId) {
      await newComment.populate("studentId", "firstName lastName email");
    }

    // Confirmation email to commenter (fire-and-forget)
    const toEmail = studentId ? (newComment.studentId?.email || null) : commentEmail;
    if (toEmail) {
      getEmailTemplateContent("blog_comment_received", {}).then(({ subject, text, html }) =>
        sendMail({ to: toEmail, subject, text, html }).catch((err) =>
          console.error("Blog comment confirmation email error:", err)
        )
      );
    }

    return successResponse(
      newComment,
      "Comment submitted successfully. It will be reviewed before being published.",
      201
    );
  } catch (error) {
    // Handle validation errors from mongoose
    if (error.message && error.message.includes("must be provided")) {
      return errorResponse(
        "Either student authentication or both name and email must be provided",
        400
      );
    }
    return handleApiError(error, "Failed to create comment");
  }
}
