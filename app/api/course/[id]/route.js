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
      "madeFor", "mode", "target", "subjectCovered", "sessionLength",
      "tests", "fullLength", "feeUsaEurope", "feeIndiaMeSe", "timeZone",
      "batchClosingDays", "callPhone", "totalStudents", "videoUrl", "videoThumbnail", "brochureButtonUrl",
    ];
    const str = (v) => (v != null && v !== "" ? String(v).trim() : "");
    const numOrNull = (v) => (v != null && v !== "" ? Number(v) : null);
    allowed.forEach((key) => {
      if (body[key] === undefined) return;
      if (key === "title") updateData.title = str(body.title) || "";
      else if (key === "shortDescription") updateData.shortDescription = str(body.shortDescription);
      else if (key === "hours") updateData.hours = str(body.hours);
      else if (key === "lessonsRange") updateData.lessonsRange = str(body.lessonsRange);
      else if (key === "durationLabel") updateData.durationLabel = str(body.durationLabel);
      else if (key === "createdBy") updateData.createdBy = str(body.createdBy);
      else if (key === "price") updateData.price = numOrNull(body.price);
      else if (key === "reviewCount") updateData.reviewCount = Math.max(0, parseInt(body.reviewCount, 10) || 0);
      else if (key === "rating") updateData.rating = Math.min(5, Math.max(0, Number(body.rating) || 5));
      else if (key === "image") updateData.image = str(body.image);
      else if (key === "examId") updateData.examId = body.examId?.trim() || null;
      else if (key === "status") updateData.status = body.status || "active";
      else if (key === "orderNumber") updateData.orderNumber = Number(body.orderNumber) || 0;
      else if (key === "metaTitle") updateData.metaTitle = str(body.metaTitle);
      else if (key === "metaDescription") updateData.metaDescription = str(body.metaDescription);
      else if (key === "keywords") updateData.keywords = str(body.keywords);
      else if (key === "content") updateData.content = body.content ?? "";
      else if (key === "batchClosingDays") updateData.batchClosingDays = numOrNull(body.batchClosingDays);
      else if (key === "callPhone") updateData.callPhone = str(body.callPhone);
      else if (key === "totalStudents") updateData.totalStudents = body.totalStudents != null && body.totalStudents !== "" ? Math.max(0, parseInt(body.totalStudents, 10) || 0) : null;
      else if (key === "videoUrl") updateData.videoUrl = str(body.videoUrl);
      else if (key === "videoThumbnail") updateData.videoThumbnail = str(body.videoThumbnail);
      else if (key === "brochureButtonUrl") updateData.brochureButtonUrl = str(body.brochureButtonUrl);
      else if (["madeFor", "mode", "target", "subjectCovered", "sessionLength", "tests", "fullLength", "feeUsaEurope", "feeIndiaMeSe", "timeZone"].includes(key)) {
        updateData[key] = str(body[key]);
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
