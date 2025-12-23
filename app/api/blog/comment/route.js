import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import BlogComment from "@/models/BlogComment";
import mongoose from "mongoose";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";

// GET: Fetch all comments for admin management
export async function GET(request) {
  try {
    // Require admin authentication
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);

    // Parse pagination
    const { page, limit, skip } = parsePagination(searchParams);

    // Get filters
    const status = searchParams.get("status") || "all";
    const blogId = searchParams.get("blogId");
    const hasUrl = searchParams.get("hasUrl"); // Filter comments with URLs
    const search = searchParams.get("search"); // Search in comment text

    // Build query
    const query = {};
    if (status !== "all") {
      query.status = status;
    }
    if (blogId && mongoose.Types.ObjectId.isValid(blogId)) {
      query.blogId = blogId;
    }
    if (hasUrl === "true") {
      query.hasUrl = true;
    }

    // Build search query for comment text, student name/email, or anonymous name/email
    let searchQuery = {};
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: "i" };
      searchQuery = {
        $or: [
          { comment: searchRegex },
          { name: searchRegex },
          { email: searchRegex },
        ],
      };
    }

    // Combine query and searchQuery
    const finalQuery =
      Object.keys(searchQuery).length > 0
        ? { $and: [query, searchQuery] }
        : query;

    // Fetch comments with pagination
    const [total, comments] = await Promise.all([
      BlogComment.countDocuments(finalQuery),
      BlogComment.find(finalQuery)
        .populate("blogId", "name slug")
        .populate("studentId", "firstName lastName email")
        .sort({ hasUrl: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const response = createPaginationResponse(comments, total, page, limit);

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, "Failed to fetch comments");
  }
}
