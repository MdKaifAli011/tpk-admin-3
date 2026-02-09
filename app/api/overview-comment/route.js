import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import OverviewComment from "@/models/OverviewComment";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { verifyStudentToken } from "@/lib/studentAuth";
import { requireAuth } from "@/middleware/authMiddleware";

const ENTITY_TYPES = ["exam", "subject", "unit", "chapter", "topic", "subtopic"];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const status = searchParams.get("status") || "approved";
    const listAll = searchParams.get("listAll") === "true";

    await connectDB();

    // Admin: list all comments (no entity filter)
    if (listAll) {
      const authCheck = await requireAuth(request);
      const isError = authCheck && typeof authCheck.json === "function";
      if (isError || !authCheck?.role) {
        if (isError) return authCheck;
        return NextResponse.json(
          { success: false, message: "Unauthorized", timestamp: new Date().toISOString() },
          { status: 401 }
        );
      }
      const query = {};
      if (status !== "all") query.status = status;
      const comments = await OverviewComment.find(query)
        .populate("studentId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .lean();
      const formatted = comments.map((c) => ({
        ...c,
        anonymousName: c.studentId ? null : c.name,
        anonymousEmail: c.studentId ? null : c.email,
      }));
      return successResponse(formatted);
    }

    // Public: require entityType and entityId
    if (!entityType || !ENTITY_TYPES.includes(entityType)) {
      return errorResponse("Valid entityType is required", 400);
    }
    if (!entityId || !mongoose.Types.ObjectId.isValid(entityId)) {
      return errorResponse("Valid entityId is required", 400);
    }

    const query = { entityType, entityId };
    if (status !== "all") query.status = status;

    const limit = Math.min(Math.max(parseInt(searchParams.get("limit"), 10) || 10, 1), 100);
    const skip = Math.max(parseInt(searchParams.get("skip"), 10) || 0, 0);

    const [comments, total] = await Promise.all([
      OverviewComment.find(query)
        .populate("studentId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OverviewComment.countDocuments(query),
    ]);

    const formatted = comments.map((c) => ({
      ...c,
      anonymousName: c.studentId ? null : c.name,
      anonymousEmail: c.studentId ? null : c.email,
    }));

    return successResponse({ data: formatted, total });
  } catch (error) {
    return handleApiError(error, "Failed to fetch comments");
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const { entityType, entityId, comment, name, email } = body;

    if (!entityType || !ENTITY_TYPES.includes(entityType)) {
      return errorResponse("Valid entityType is required", 400);
    }
    if (!entityId || !mongoose.Types.ObjectId.isValid(entityId)) {
      return errorResponse("Valid entityId is required", 400);
    }
    if (!comment || !comment.trim()) {
      return errorResponse("Comment is required", 400);
    }
    if (comment.trim().length > 2000) {
      return errorResponse("Comment cannot exceed 2000 characters", 400);
    }

    const authCheck = await verifyStudentToken(request);
    let studentId = null;
    let commentName = null;
    let commentEmail = null;

    if (!authCheck.error && authCheck.studentId) {
      studentId = authCheck.studentId;
    } else {
      if (!name || !name.trim()) {
        return errorResponse("Name is required for anonymous comments", 400);
      }
      if (!email || !email.trim()) {
        return errorResponse("Email is required for anonymous comments", 400);
      }
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email.trim())) {
        return errorResponse("Please provide a valid email address", 400);
      }
      if (name.trim().length < 2) {
        return errorResponse("Name must be at least 2 characters", 400);
      }
      commentName = name.trim();
      commentEmail = email.trim().toLowerCase();
    }

    const commentData = {
      entityType,
      entityId,
      comment: comment.trim(),
      status: "pending",
    };
    if (studentId) commentData.studentId = studentId;
    else {
      commentData.name = commentName;
      commentData.email = commentEmail;
    }

    const newComment = await OverviewComment.create(commentData);
    if (studentId) {
      await newComment.populate("studentId", "firstName lastName email");
    }

    return successResponse(
      newComment,
      "Comment submitted successfully. It will be reviewed before being published.",
      201
    );
  } catch (error) {
    if (error.message?.includes("must be provided")) {
      return errorResponse(
        "Either student authentication or both name and email must be provided",
        400
      );
    }
    return handleApiError(error, "Failed to create comment");
  }
}
