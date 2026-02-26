import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import Exam from "@/models/Exam";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const examSlug = searchParams.get("exam");
    const examIdParam = searchParams.get("examId");
    const statusFilter = searchParams.get("status") || "all";

    const isPublicRequest = !examIdParam && !!examSlug;
    if (!isPublicRequest) {
      const authCheck = await requireAuth(request);
      if (authCheck.error) {
        return NextResponse.json(authCheck, { status: authCheck.status || 401 });
      }
    }

    await connectDB();

    let query = {};

    if (examSlug) {
      const slugTrimmed = String(examSlug).trim();
      if (!slugTrimmed) {
        return successResponse([]);
      }
      const mongoose = await import("mongoose");
      const isObjectId = mongoose.default.Types.ObjectId.isValid(slugTrimmed) && slugTrimmed.length === 24 && String(new mongoose.default.Types.ObjectId(slugTrimmed)) === slugTrimmed;

      let exam = null;
      if (isObjectId) {
        exam = await Exam.findById(slugTrimmed).select("_id").lean();
      }
      if (!exam) {
        const slugEscaped = slugTrimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$0");
        const slugExact = new RegExp("^" + slugEscaped + "$", "i");
        const nameFromSlug = slugTrimmed.replace(/-/g, " ");
        const nameEscaped = nameFromSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$0");
        const nameExact = new RegExp("^" + nameEscaped + "$", "i");
        // Prefer exact slug/name match, then fall back to "starts with" (e.g. "neet" matches "NEET Exam")
        exam = await Exam.findOne({
          $or: [{ slug: slugExact }, { name: nameExact }],
        }).select("_id").lean();
        if (!exam) {
          const slugStarts = new RegExp("^" + slugEscaped, "i");
          const nameStarts = new RegExp("^" + nameEscaped, "i");
          exam = await Exam.findOne({
            $or: [{ slug: slugStarts }, { name: nameStarts }],
          }).select("_id").lean();
        }
      }
      if (!exam) {
        return successResponse([]);
      }
      query.examId = exam._id;
    } else if (examIdParam) {
      query.examId = examIdParam;
    }

    if (statusFilter !== "all") {
      query.status = statusFilter;
    } else if (isPublicRequest) {
      query.status = "active";
    }

    const courses = await Course.find(query)
      .sort({ orderNumber: 1, createdAt: -1 })
      .populate("examId", "name slug")
      .lean();

    return successResponse(courses);
  } catch (error) {
    return handleApiError(error, "Failed to fetch courses");
  }
}

export async function POST(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const body = await request.json();

    if (!body.examId || !String(body.examId).trim()) {
      return errorResponse("Exam is required. Select which exam this course belongs to.", 400);
    }
    if (!body.title || !String(body.title).trim()) {
      return errorResponse("Course title is required", 400);
    }

    const course = await Course.create({
      examId: String(body.examId).trim(),
      title: String(body.title).trim(),
      shortDescription: (body.shortDescription && String(body.shortDescription).trim()) || "",
      hours: (body.hours && String(body.hours).trim()) || "",
      lessonsRange: (body.lessonsRange && String(body.lessonsRange).trim()) || "",
      durationLabel: (body.durationLabel && String(body.durationLabel).trim()) || "",
      createdBy: (body.createdBy && String(body.createdBy).trim()) || "",
      price: body.price != null && body.price !== "" ? Number(body.price) : null,
      reviewCount: body.reviewCount != null && body.reviewCount !== "" ? Math.max(0, parseInt(body.reviewCount, 10)) : 0,
      rating: body.rating != null && body.rating !== "" ? Math.min(5, Math.max(0, Number(body.rating))) : 5,
      image: (body.image && String(body.image).trim()) || "",
      status: body.status || "active",
      orderNumber: body.orderNumber != null ? Number(body.orderNumber) : 0,
    });

    const populated = await Course.findById(course._id).populate("examId", "name slug");
    return successResponse(populated, "Course created successfully", 201);
  } catch (error) {
    return handleApiError(error, "Failed to create course");
  }
}
