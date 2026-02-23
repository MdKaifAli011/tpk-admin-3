import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Page from "../../../models/Page";
import Exam from "../../../models/Exam";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";
import { STATUS } from "@/constants";

/** Resolve exam param (slug or id) to ObjectId; "site" or empty => null */
async function resolveExamParam(examParam) {
  if (!examParam || examParam === "site") return null;
  if (mongoose.Types.ObjectId.isValid(examParam)) {
    const e = await Exam.findById(examParam).select("_id").lean();
    return e?._id || null;
  }
  const e = await Exam.findOne({ slug: examParam }).select("_id").lean();
  return e?._id || null;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "all";
    const examFilter = searchParams.get("exam") || "all"; // "all" | "site" | examSlug
    const deletedFilter = searchParams.get("deleted") || "false"; // "false" | "true" | "only"

    // Public: only active, no deleted. Admin: filters require auth
    const isPublicRequest =
      statusFilter === "active" || statusFilter === STATUS.ACTIVE;

    if (!isPublicRequest || deletedFilter !== "false") {
      const authCheck = await requireAuth(request);
      if (authCheck.error) {
        return NextResponse.json(authCheck, {
          status: authCheck.status || 401,
        });
      }
    }

    await connectDB();

    const query = {};
    if (statusFilter !== "all") query.status = statusFilter;
    if (deletedFilter === "false") query.deletedAt = null;
    else if (deletedFilter === "only") query.deletedAt = { $ne: null };

    if (examFilter !== "all") {
      const examId = await resolveExamParam(examFilter);
      query.exam = examId;
    }

    const pages = await Page.find(query)
      .populate("exam", "slug name")
      .sort({ updatedAt: -1 })
      .lean();

    return successResponse(pages);
  } catch (error) {
    return handleApiError(error, "Failed to fetch pages");
  }
}

export async function POST(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, {
        status: authCheck.status || 403,
      });
    }

    await connectDB();
    const body = await request.json();

    if (!body.title || !body.title.trim()) {
      return errorResponse("Page title is required", 400);
    }

    const examId = await resolveExamParam(body.exam || "site");

    const newPage = await Page.create({
      title: body.title.trim(),
      exam: examId,
      content: body.content || "",
      status: body.status || "draft",
      metaTitle: (body.metaTitle || "").trim(),
      metaDescription: (body.metaDescription || "").trim(),
      keywords: (body.keywords || "").trim(),
    });

    const populated = await Page.findById(newPage._id)
      .populate("exam", "slug name")
      .lean();

    return successResponse(populated, "Page created successfully", 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse("A page with this slug already exists in this scope", 409);
    }
    return handleApiError(error, "Failed to create page");
  }
}
