import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import OverviewComment from "@/models/OverviewComment";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { verifyStudentToken } from "@/lib/studentAuth";
import { requireAuth } from "@/middleware/authMiddleware";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";

const ENTITY_TYPES = ["exam", "subject", "unit", "chapter", "topic", "subtopic", "definition"];

const LABELS = { exam: "Exam", subject: "Subject", unit: "Unit", chapter: "Chapter", topic: "Topic", subtopic: "SubTopic", definition: "Definition" };

async function attachHierarchyPaths(comments) {
  if (!comments?.length) return comments;
  const byType = {};
  comments.forEach((c) => {
    if (!c.entityType || !c.entityId) return;
    const id = c.entityId._id ? c.entityId._id.toString() : c.entityId.toString();
    if (!byType[c.entityType]) byType[c.entityType] = new Set();
    byType[c.entityType].add(id);
  });
  const pathMap = {};
  const ids = (set) => Array.from(set).filter((id) => mongoose.Types.ObjectId.isValid(id));

  for (const entityType of ENTITY_TYPES) {
    const idList = ids(byType[entityType] || new Set());
    if (idList.length === 0) continue;
    let entities = [];
    switch (entityType) {
      case "exam":
        entities = await Exam.find({ _id: { $in: idList } }).select("name").lean();
        entities.forEach((e) => { pathMap[`exam:${e._id}`] = [{ label: "Exam", name: e.name || "—" }]; });
        break;
      case "subject":
        entities = await Subject.find({ _id: { $in: idList } }).populate("examId", "name").lean();
        entities.forEach((s) => { pathMap[`subject:${s._id}`] = [{ label: "Exam", name: s.examId?.name || "—" }, { label: "Subject", name: s.name || "—" }]; });
        break;
      case "unit":
        entities = await Unit.find({ _id: { $in: idList } }).populate("subjectId examId", "name").lean();
        entities.forEach((u) => { pathMap[`unit:${u._id}`] = [{ label: "Exam", name: u.examId?.name || "—" }, { label: "Subject", name: u.subjectId?.name || "—" }, { label: "Unit", name: u.name || "—" }]; });
        break;
      case "chapter":
        entities = await Chapter.find({ _id: { $in: idList } }).populate("unitId subjectId examId", "name").lean();
        entities.forEach((c) => { pathMap[`chapter:${c._id}`] = [{ label: "Exam", name: c.examId?.name || "—" }, { label: "Subject", name: c.subjectId?.name || "—" }, { label: "Unit", name: c.unitId?.name || "—" }, { label: "Chapter", name: c.name || "—" }]; });
        break;
      case "topic":
        entities = await Topic.find({ _id: { $in: idList } }).populate("chapterId unitId subjectId examId", "name").lean();
        entities.forEach((t) => { pathMap[`topic:${t._id}`] = [{ label: "Exam", name: t.examId?.name || "—" }, { label: "Subject", name: t.subjectId?.name || "—" }, { label: "Unit", name: t.unitId?.name || "—" }, { label: "Chapter", name: t.chapterId?.name || "—" }, { label: "Topic", name: t.name || "—" }]; });
        break;
      case "subtopic":
        entities = await SubTopic.find({ _id: { $in: idList } }).populate("topicId chapterId unitId subjectId examId", "name").lean();
        entities.forEach((s) => { pathMap[`subtopic:${s._id}`] = [{ label: "Exam", name: s.examId?.name || "—" }, { label: "Subject", name: s.subjectId?.name || "—" }, { label: "Unit", name: s.unitId?.name || "—" }, { label: "Chapter", name: s.chapterId?.name || "—" }, { label: "Topic", name: s.topicId?.name || "—" }, { label: "SubTopic", name: s.name || "—" }]; });
        break;
      case "definition":
        entities = await Definition.find({ _id: { $in: idList } }).populate("subTopicId topicId chapterId unitId subjectId examId", "name").lean();
        entities.forEach((d) => { pathMap[`definition:${d._id}`] = [{ label: "Exam", name: d.examId?.name || "—" }, { label: "Subject", name: d.subjectId?.name || "—" }, { label: "Unit", name: d.unitId?.name || "—" }, { label: "Chapter", name: d.chapterId?.name || "—" }, { label: "Topic", name: d.topicId?.name || "—" }, { label: "SubTopic", name: d.subTopicId?.name || "—" }, { label: "Definition", name: d.name || d.term || "—" }]; });
        break;
      default:
        break;
    }
  }

  return comments.map((c) => {
    const id = c.entityId?._id ? c.entityId._id.toString() : c.entityId?.toString();
    const path = pathMap[`${c.entityType}:${id}`] || [{ label: LABELS[c.entityType] || c.entityType, name: "—" }];
    return { ...c, hierarchyPath: path };
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const status = searchParams.get("status") || "approved";
    const listAll = searchParams.get("listAll") === "true";

    await connectDB();

    // Admin: list all comments (no entity filter)
    if (listAll) {
      const authCheck = await requireAuth(request);
      const isError = authCheck && typeof authCheck.json === "function";
      if (isError || !authCheck?.role) {
        if (isError) return authCheck;
        return NextResponse.json(
          { success: false, message: "Unauthorized", timestamp: new Date().toISOString() },
          { status: 401 }
        );
      }
      const includeHierarchy = searchParams.get("includeHierarchy") === "true";
      const query = {};
      if (status !== "all") query.status = status;
      const comments = await OverviewComment.find(query)
        .populate("studentId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .lean();
      let formatted = comments.map((c) => ({
        ...c,
        anonymousName: c.studentId ? null : c.name,
        anonymousEmail: c.studentId ? null : c.email,
      }));
      if (includeHierarchy && formatted.length > 0) {
        formatted = await attachHierarchyPaths(formatted);
      }
      return successResponse(formatted);
    }

    // Public: require entityType and entityId
    if (!entityType || !ENTITY_TYPES.includes(entityType)) {
      return errorResponse("Valid entityType is required", 400);
    }
    if (!entityId || !mongoose.Types.ObjectId.isValid(entityId)) {
      return errorResponse("Valid entityId is required", 400);
    }

    const query = { entityType, entityId };
    if (status !== "all") query.status = status;

    const limit = Math.min(Math.max(parseInt(searchParams.get("limit"), 10) || 10, 1), 100);
    const skip = Math.max(parseInt(searchParams.get("skip"), 10) || 0, 0);

    const [comments, total] = await Promise.all([
      OverviewComment.find(query)
        .populate("studentId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OverviewComment.countDocuments(query),
    ]);

    const formatted = comments.map((c) => ({
      ...c,
      anonymousName: c.studentId ? null : c.name,
      anonymousEmail: c.studentId ? null : c.email,
    }));

    return successResponse({ data: formatted, total });
  } catch (error) {
    return handleApiError(error, "Failed to fetch comments");
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const { entityType, entityId, comment, name, email } = body;

    if (!entityType || !ENTITY_TYPES.includes(entityType)) {
      return errorResponse("Valid entityType is required", 400);
    }
    if (!entityId || !mongoose.Types.ObjectId.isValid(entityId)) {
      return errorResponse("Valid entityId is required", 400);
    }
    if (!comment || !comment.trim()) {
      return errorResponse("Comment is required", 400);
    }
    if (comment.trim().length > 2000) {
      return errorResponse("Comment cannot exceed 2000 characters", 400);
    }

    const authCheck = await verifyStudentToken(request);
    let studentId = null;
    let commentName = null;
    let commentEmail = null;

    if (!authCheck.error && authCheck.studentId) {
      studentId = authCheck.studentId;
    } else {
      if (!name || !name.trim()) {
        return errorResponse("Name is required for anonymous comments", 400);
      }
      if (!email || !email.trim()) {
        return errorResponse("Email is required for anonymous comments", 400);
      }
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email.trim())) {
        return errorResponse("Please provide a valid email address", 400);
      }
      if (name.trim().length < 2) {
        return errorResponse("Name must be at least 2 characters", 400);
      }
      commentName = name.trim();
      commentEmail = email.trim().toLowerCase();
    }

    const commentData = {
      entityType,
      entityId,
      comment: comment.trim(),
      status: "pending",
    };
    if (studentId) commentData.studentId = studentId;
    else {
      commentData.name = commentName;
      commentData.email = commentEmail;
    }

    const newComment = await OverviewComment.create(commentData);
    if (studentId) {
      await newComment.populate("studentId", "firstName lastName email");
    }

    return successResponse(
      newComment,
      "Comment submitted successfully. It will be reviewed before being published.",
      201
    );
  } catch (error) {
    if (error.message?.includes("must be provided")) {
      return errorResponse(
        "Either student authentication or both name and email must be provided",
        400
      );
    }
    return handleApiError(error, "Failed to create comment");
  }
}
