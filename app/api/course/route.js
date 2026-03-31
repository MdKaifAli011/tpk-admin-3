import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import Exam from "@/models/Exam";
import mongoose from "mongoose";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const examSlug = searchParams.get("exam");
    const examIdParam = searchParams.get("examId");
    const statusFilter = searchParams.get("status") || "all";
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const usePagination = pageParam != null || limitParam != null;
    const page = usePagination ? Math.max(1, parseInt(pageParam || "1", 10) || 1) : 1;
    const limit = usePagination ? Math.min(100, Math.max(1, parseInt(limitParam || "10", 10) || 10)) : 1000;

    // Public: either exam slug (no id) or examId only (for exact exam from server)
    const isPublicRequest =
      (!!examSlug && !examIdParam) ||
      (!!examIdParam && !examSlug);
    if (!isPublicRequest) {
      const authCheck = await requireAuth(request);
      if (authCheck.error) {
        return NextResponse.json(authCheck, { status: authCheck.status || 401 });
      }
    }

    await connectDB();

    let query = {};

    if (examIdParam) {
      const idStr = String(examIdParam).trim();
      if (!mongoose.Types.ObjectId.isValid(idStr)) {
        return successResponse([]);
      }
      // Match both ObjectId and string examId (DB has mixed types)
      query.$or = [
        { examId: new mongoose.Types.ObjectId(idStr) },
        { examId: idStr },
      ];
    } else if (examSlug) {
      const slugTrimmed = String(examSlug).trim();
      if (!slugTrimmed) {
        return successResponse([]);
      }
      const isObjectId = mongoose.Types.ObjectId.isValid(slugTrimmed) && slugTrimmed.length === 24 && String(new mongoose.Types.ObjectId(slugTrimmed)) === slugTrimmed;

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
      // Match both ObjectId and string examId (DB may have mixed types)
      const examIdObj = exam._id;
      const examIdStr = examIdObj?.toString?.() || String(examIdObj);
      query.$or = [
        { examId: examIdObj },
        ...(examIdStr ? [{ examId: examIdStr }] : []),
      ];
    }

    if (statusFilter !== "all") {
      query.status = statusFilter;
    } else if (isPublicRequest) {
      query.status = "active";
    }

    // When query uses $or (examId as ObjectId or string), use native collection
    // so Mongoose doesn't cast string to ObjectId and we match both DB types
    let courses;
    if (query.$or) {
      const raw = await Course.collection
        .find(query)
        .sort({ orderNumber: 1, createdAt: -1 })
        .toArray();
      const ids = raw.map((d) => d._id);
      if (ids.length === 0) {
        if (usePagination) {
          return NextResponse.json({
            success: true,
            message: "Data fetched successfully",
            data: [],
            pagination: { total: 0, page: 1, limit, totalPages: 0 },
            timestamp: new Date().toISOString(),
          }, { status: 200 });
        }
        return successResponse([]);
      }
      const list = await Course.find({ _id: { $in: ids } })
        .populate("examId", "name slug")
        .lean();
      const order = new Map(ids.map((id, i) => [id.toString(), i]));
      list.sort((a, b) => (order.get(a._id.toString()) ?? 0) - (order.get(b._id.toString()) ?? 0));
      courses = list;
    } else {
      courses = await Course.find(query)
        .sort({ orderNumber: 1, createdAt: -1 })
        .populate("examId", "name slug")
        .lean();
    }

    if (!usePagination) {
      return successResponse(courses);
    }

    const total = courses.length;
    const totalPages = Math.max(0, Math.ceil(total / limit));
    const pageClamped = Math.min(page, totalPages || 1);
    const skip = (pageClamped - 1) * limit;
    const pageData = courses.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      message: "Data fetched successfully",
      data: pageData,
      pagination: { total, page: pageClamped, limit, totalPages },
      timestamp: new Date().toISOString(),
    }, { status: 200 });
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
      instructorImage: (body.instructorImage && String(body.instructorImage).trim()) || "",
      price: body.price != null && body.price !== "" ? Number(body.price) : null,
      reviewCount: body.reviewCount != null && body.reviewCount !== "" ? Math.max(0, parseInt(body.reviewCount, 10)) : 0,
      rating: body.rating != null && body.rating !== "" ? Math.min(5, Math.max(0, Number(body.rating))) : 5,
      image: (body.image && String(body.image).trim()) || "",
      videoUrl: (body.videoUrl && String(body.videoUrl).trim()) || "",
      videoThumbnail: (body.videoThumbnail && String(body.videoThumbnail).trim()) || "",
      brochureButtonUrl: (body.brochureButtonUrl && String(body.brochureButtonUrl).trim()) || "",
      status: body.status || "active",
      orderNumber: body.orderNumber != null ? Number(body.orderNumber) : 0,
    });

    const populated = await Course.findById(course._id).populate("examId", "name slug");
    return successResponse(populated, "Course created successfully", 201);
  } catch (error) {
    return handleApiError(error, "Failed to create course");
  }
}
