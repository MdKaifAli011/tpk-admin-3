import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Page from "../../../../models/Page";
import Exam from "../../../../models/Exam";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
  notFoundResponse,
} from "@/utils/apiResponse";
import { requireAction, requireAuth } from "@/middleware/authMiddleware";

async function resolveExamParam(examParam) {
  if (!examParam || examParam === "site") return null;
  if (mongoose.Types.ObjectId.isValid(examParam)) {
    const e = await Exam.findById(examParam).select("_id").lean();
    return e?._id || null;
  }
  const e = await Exam.findOne({ slug: examParam }).select("_id").lean();
  return e?._id || null;
}

/** Resolve page by id or slug; optional examScope = "site" | examSlug for slug lookup */
async function findPage(slugOrId, examScope, options = {}) {
  const { includeDeleted = false, publicOnly = false } = options;
  if (mongoose.Types.ObjectId.isValid(slugOrId)) {
    const q = { _id: new mongoose.Types.ObjectId(slugOrId) };
    if (!includeDeleted) q.deletedAt = null;
    if (publicOnly) q.status = "active";
    return Page.findOne(q);
  }
  const slugQuery = { slug: slugOrId };
  if (examScope !== undefined) {
    const examId = await resolveExamParam(examScope);
    slugQuery.exam = examId;
  }
  if (!includeDeleted) slugQuery.deletedAt = null;
  if (publicOnly) slugQuery.status = "active";
  return Page.findOne(slugQuery);
}

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { slugOrId } = await params;
    const { searchParams } = new URL(request.url);
    const examParam = searchParams.get("exam") || null;

    let isAdmin = false;
    try {
      const authResult = await requireAuth(request);
      isAdmin = !!(authResult && !authResult.error && authResult.role);
    } catch {
      // Public request: only non-deleted, active pages
    }

    const page = await findPage(slugOrId, examParam, {
      includeDeleted: isAdmin,
      publicOnly: !isAdmin,
    });

    if (!page) {
      return notFoundResponse("Page not found");
    }

    const populated = await Page.findById(page._id).populate("exam", "slug name").lean();
    return successResponse(populated);
  } catch (error) {
    return handleApiError(error, "Failed to fetch page");
  }
}

async function resolvePageId(slugOrId, examScope) {
  const p = await findPage(slugOrId, examScope, { includeDeleted: true });
  return p?._id?.toString() || null;
}

export async function PUT(request, { params }) {
  try {
    const authCheck = await requireAction(request, "PUT");
    if (authCheck.error) {
      return NextResponse.json(authCheck, {
        status: authCheck.status || 403,
      });
    }

    await connectDB();
    const { slugOrId } = await params;
    const body = await request.json();
    const examParam = body.exam !== undefined ? (body.exam || "site") : undefined;
    const pageId = await resolvePageId(slugOrId, examParam);
    if (!pageId) {
      return notFoundResponse("Page not found");
    }

    const updateData = {
      ...(body.title !== undefined && { title: body.title.trim() }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.metaTitle !== undefined && { metaTitle: body.metaTitle.trim() }),
      ...(body.metaDescription !== undefined && {
        metaDescription: body.metaDescription.trim(),
      }),
      ...(body.keywords !== undefined && {
        keywords: body.keywords.trim(),
      }),
      ...(body.deletedAt === null && { deletedAt: null }),
    };

    if (body.exam !== undefined) {
      const examId = await resolveExamParam(body.exam || "site");
      updateData.exam = examId;
    }

    const updatedPage = await Page.findByIdAndUpdate(
      pageId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("exam", "slug name")
      .lean();

    if (!updatedPage) {
      return notFoundResponse("Page not found");
    }

    return successResponse(updatedPage, "Page updated successfully");
  } catch (error) {
    return handleApiError(error, "Failed to update page");
  }
}

export async function DELETE(request, { params }) {
  try {
    const authCheck = await requireAction(request, "DELETE");
    if (authCheck.error) {
      return NextResponse.json(authCheck, {
        status: authCheck.status || 403,
      });
    }

    await connectDB();
    const { slugOrId } = await params;
    const { searchParams } = new URL(request.url);
    const examParam = searchParams.get("exam") || undefined;
    const pageId = await resolvePageId(slugOrId, examParam);
    if (!pageId) {
      return notFoundResponse("Page not found");
    }

    const updated = await Page.findByIdAndUpdate(
      pageId,
      { $set: { deletedAt: new Date() } },
      { new: true }
    )
      .populate("exam", "slug name")
      .lean();

    if (!updated) {
      return notFoundResponse("Page not found");
    }

    return successResponse(updated, "Page deleted (can be restored from admin)");
  } catch (error) {
    return handleApiError(error, "Failed to delete page");
  }
}
