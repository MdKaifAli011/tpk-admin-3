import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Faculty from "@/models/Faculty";
import mongoose from "mongoose";
import { successResponse, errorResponse, notFoundResponse, handleApiError } from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";

export async function PATCH(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid faculty ID", 400);
    }

    const body = await request.json();
    const updateData = {};
    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.imageUrl !== undefined) updateData.imageUrl = String(body.imageUrl).trim();
    if (body.orderNumber !== undefined) updateData.orderNumber = Number(body.orderNumber);

    await connectDB();
    const faculty = await Faculty.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!faculty) return notFoundResponse("Faculty not found");
    return successResponse(faculty, "Faculty updated");
  } catch (error) {
    return handleApiError(error, "Failed to update faculty");
  }
}

export async function DELETE(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid faculty ID", 400);
    }

    await connectDB();
    const faculty = await Faculty.findByIdAndDelete(id);
    if (!faculty) return notFoundResponse("Faculty not found");
    return successResponse({ deleted: true }, "Faculty deleted");
  } catch (error) {
    return handleApiError(error, "Failed to delete faculty");
  }
}
