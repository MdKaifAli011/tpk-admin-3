import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import Exam from "@/models/Exam";
import mongoose from "mongoose";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const examSlug = searchParams.get("exam");
    const examIdParam = searchParams.get("examId");
    const statusFilter = searchParams.get("status") || "all";
    const search = searchParams.get("search")?.trim();
    const { page, limit, skip } = parsePagination(searchParams);

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
        return NextResponse.json(createPaginationResponse([], 0, page, limit));
      }
      query.$or = [
        { examId: new mongoose.Types.ObjectId(idStr) },
        { examId: idStr },
      ];
    } else if (examSlug) {
      const slugTrimmed = String(examSlug).trim();
      if (!slugTrimmed) {
        return NextResponse.json(createPaginationResponse([], 0, page, limit));
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
        return NextResponse.json(createPaginationResponse([], 0, page, limit));
      }
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

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const searchConditions = [
        { title: { $regex: regex } },
        { shortDescription: { $regex: regex } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    if (query.$or) {
      const raw = await Course.collection
        .find(query)
        .sort({ orderNumber: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      const total = await Course.collection.countDocuments(query);
      const ids = raw.map((d) => d._id);
      if (ids.length === 0) {
        return NextResponse.json(createPaginationResponse([], total, page, limit));
      }
      const list = await Course.find({ _id: { $in: ids } })
        .populate("examId", "name slug")
        .lean();
      const order = new Map(ids.map((id, i) => [id.toString(), i]));
      list.sort((a, b) => (order.get(a._id.toString()) ?? 0) - (order.get(b._id.toString()) ?? 0));
      return NextResponse.json(createPaginationResponse(list, total, page, limit));
    }

    const [courses, total] = await Promise.all([
      Course.find(query)
        .sort({ orderNumber: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("examId", "name slug")
        .lean(),
      Course.countDocuments(query),
    ]);

    return NextResponse.json(createPaginationResponse(courses, total, page, limit));
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
