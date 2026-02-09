import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Page from "../../../../models/Page";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
  notFoundResponse,
} from "@/utils/apiResponse";
import { requireAction, requireAuth } from "@/middleware/authMiddleware";

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { slugOrId } = await params;

    let page = null;
    if (mongoose.Types.ObjectId.isValid(slugOrId)) {
      page = await Page.findById(slugOrId);
    }
    if (!page) {
      // Treat as slug: admin can fetch any status, public only active
      const authResult = await requireAuth(request);
      const isAdmin = !!(authResult && authResult.role);
      if (isAdmin) {
        page = await Page.findOne({ slug: slugOrId });
      } else {
        page = await Page.findOne({ slug: slugOrId, status: "active" });
      }
    }

    if (!page) {
      return notFoundResponse("Page not found");
    }

    return successResponse(page);
  } catch (error) {
    return handleApiError(error, "Failed to fetch page");
  }
}

async function resolvePageId(slugOrId) {
  if (mongoose.Types.ObjectId.isValid(slugOrId)) {
    const p = await Page.findById(slugOrId);
    return p?._id?.toString() || null;
  }
  const p = await Page.findOne({ slug: slugOrId });
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

    const pageId = await resolvePageId(slugOrId);
    if (!pageId) {
      return notFoundResponse("Page not found");
    }

    const updateData = {
      ...(body.title !== undefined && { title: body.title.trim() }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.metaDescription !== undefined && {
        metaDescription: body.metaDescription.trim(),
      }),
      ...(body.keywords !== undefined && {
        keywords: body.keywords.trim(),
      }),
    };

    const updatedPage = await Page.findByIdAndUpdate(
      pageId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

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

    const pageId = await resolvePageId(slugOrId);
    if (!pageId) {
      return notFoundResponse("Page not found");
    }

    const deletedPage = await Page.findByIdAndDelete(pageId);

    if (!deletedPage) {
      return notFoundResponse("Page not found");
    }

    return successResponse(deletedPage, "Page deleted successfully");
  } catch (error) {
    return handleApiError(error, "Failed to delete page");
  }
}
