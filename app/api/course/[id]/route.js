import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import mongoose from "mongoose";
import { successResponse, errorResponse, handleApiError, notFoundResponse } from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    let course = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      course = await Course.findById(id).populate("examId", "name slug").lean();
    }
    if (!course) {
      course = await Course.findOne({ slug: id, status: "active" }).populate("examId", "name slug").lean();
    }
    if (!course) {
      return notFoundResponse("Course not found");
    }
    return successResponse(course);
  } catch (error) {
    return handleApiError(error, "Failed to fetch course");
  }
}

export async function PATCH(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid course ID", 400);
    }

    const updateData = {};
    const allowed = [
      "examId", "title", "shortDescription", "hours", "lessonsRange",
      "durationLabel", "createdBy", "price", "reviewCount", "rating",
      "image", "status", "orderNumber",
      "metaTitle", "metaDescription", "keywords", "content",
    ];
    allowed.forEach((key) => {
      if (body[key] !== undefined) {
        if (key === "title") updateData.title = body.title?.trim() ?? "";
        else if (key === "shortDescription") updateData.shortDescription = body.shortDescription?.trim() ?? "";
        else if (key === "hours") updateData.hours = body.hours?.trim() ?? "";
        else if (key === "lessonsRange") updateData.lessonsRange = body.lessonsRange?.trim() ?? "";
        else if (key === "durationLabel") updateData.durationLabel = body.durationLabel?.trim() ?? "";
        else if (key === "createdBy") updateData.createdBy = body.createdBy?.trim() ?? "";
        else if (key === "price") updateData.price = body.price != null && body.price !== "" ? Number(body.price) : null;
        else if (key === "reviewCount") updateData.reviewCount = Math.max(0, parseInt(body.reviewCount, 10) || 0);
        else if (key === "rating") updateData.rating = Math.min(5, Math.max(0, Number(body.rating) || 5));
        else if (key === "image") updateData.image = body.image?.trim() ?? "";
        else if (key === "examId") updateData.examId = body.examId?.trim() || null;
        else if (key === "status") updateData.status = body.status || "active";
        else if (key === "orderNumber") updateData.orderNumber = Number(body.orderNumber) || 0;
        else if (key === "metaTitle") updateData.metaTitle = body.metaTitle?.trim() ?? "";
        else if (key === "metaDescription") updateData.metaDescription = body.metaDescription?.trim() ?? "";
        else if (key === "keywords") updateData.keywords = body.keywords?.trim() ?? "";
        else if (key === "content") updateData.content = body.content ?? "";
      }
    });
    // Always persist content when present in body (rich text from admin editor)
    if ("content" in body) {
      updateData.content = typeof body.content === "string" ? body.content : (body.content ?? "");
    }

    // Use native collection update so content is never stripped by Mongoose schema
    const _id = new mongoose.Types.ObjectId(id);
    const collection = Course.collection;
    await collection.updateOne(
      { _id },
      { $set: updateData }
    );

    const updated = await Course.findById(id).populate("examId", "name slug").lean();
    if (!updated) {
      return notFoundResponse("Course not found");
    }
    return successResponse(updated, "Course updated successfully");
  } catch (error) {
    return handleApiError(error, "Failed to update course");
  }
}

export async function DELETE(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid course ID", 400);
    }

    const deleted = await Course.findByIdAndDelete(id);
    if (!deleted) {
      return notFoundResponse("Course not found");
    }
    return successResponse(deleted, "Course deleted successfully");
  } catch (error) {
    return handleApiError(error, "Failed to delete course");
  }
}
