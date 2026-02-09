import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Page from "../../../models/Page";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";
import { STATUS } from "@/constants";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "all";

    // Public: only active pages. Admin: all or filtered (requires auth)
    const isPublicRequest =
      statusFilter === "active" || statusFilter === STATUS.ACTIVE;

    if (!isPublicRequest) {
      const authCheck = await requireAuth(request);
      if (authCheck.error) {
        return NextResponse.json(authCheck, {
          status: authCheck.status || 401,
        });
      }
    }

    await connectDB();

    const query = statusFilter !== "all" ? { status: statusFilter } : {};
    const pages = await Page.find(query).sort({ updatedAt: -1 });

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

    const newPage = await Page.create({
      title: body.title.trim(),
      content: body.content || "",
      status: body.status || "draft",
      metaDescription: body.metaDescription || "",
      keywords: body.keywords || "",
    });

    return successResponse(newPage, "Page created successfully", 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse("A page with this slug already exists", 409);
    }
    return handleApiError(error, "Failed to create page");
  }
}
