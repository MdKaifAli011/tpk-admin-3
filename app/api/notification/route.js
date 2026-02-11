import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import mongoose from "mongoose";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
import { createSlug } from "@/utils/serverSlug";

const ENTITY_TYPES = ["general", "exam", "exam_with_children", "subject", "unit", "chapter", "topic", "subtopic", "definition"];

async function attachHierarchyPaths(notifications) {
  if (!notifications?.length) return notifications;
  const byType = {};
  notifications.forEach((n) => {
    if (n.entityType === "general") return; // handled below
    if (!n.entityType || !n.entityId) return;
    const id = n.entityId?._id ? n.entityId._id.toString() : n.entityId?.toString();
    if (!byType[n.entityType]) byType[n.entityType] = new Set();
    byType[n.entityType].add(id);
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
      case "exam_with_children":
        entities = await Exam.find({ _id: { $in: idList } }).select("name").lean();
        entities.forEach((e) => { pathMap[`exam_with_children:${e._id}`] = [{ label: "Exam (and children)", name: e.name || "—" }]; });
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

  return notifications.map((n) => {
    if (n.entityType === "general") {
      return { ...n, hierarchyPath: [{ label: "General", name: "All pages" }] };
    }
    const id = n.entityId?._id ? n.entityId._id.toString() : n.entityId?.toString();
    const path = pathMap[`${n.entityType}:${id}`] || [{ label: n.entityType, name: "—" }];
    return { ...n, hierarchyPath: path };
  });
}

/** GET: List notifications (admin) - with filters and pagination */
export async function GET(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "all";
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const { page, limit, skip } = parsePagination(searchParams);

    let query = {};
    if (statusFilter !== "all") {
      query.status = { $regex: new RegExp(`^${statusFilter}$`, "i") };
    }
    if (entityType && ENTITY_TYPES.includes(entityType)) {
      query.entityType = entityType;
      if (entityType === "general") {
        query.$or = [{ entityId: null }, { entityId: { $exists: false } }];
      } else if (entityId && mongoose.Types.ObjectId.isValid(entityId)) {
        query.entityId = new mongoose.Types.ObjectId(entityId);
      }
    }

    const [list, total] = await Promise.all([
      Notification.find(query)
        .sort({ orderNumber: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);

    const withPaths = await attachHierarchyPaths(list);
    const pagination = createPaginationResponse(withPaths, total, page, limit);
    return successResponse(pagination);
  } catch (error) {
    return handleApiError(error, "Failed to fetch notifications");
  }
}

/** POST: Create notification (admin) */
export async function POST(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const body = await request.json();
    const { entityType, entityId, title, message, stripMessage, link, linkLabel, slug, status, iconType, orderNumber } = body;

    if (!ENTITY_TYPES.includes(entityType)) {
      return errorResponse("entityType is required", 400);
    }
    if (entityType !== "general" && !entityId) {
      return errorResponse("entityId is required when entityType is not general", 400);
    }
    if (!title?.trim()) {
      return errorResponse("title is required", 400);
    }
    if (entityType !== "general" && !mongoose.Types.ObjectId.isValid(entityId)) {
      return errorResponse("Invalid entityId", 400);
    }

    const doc = await Notification.create({
      entityType,
      entityId: entityType === "general" ? null : new mongoose.Types.ObjectId(entityId),
      title: title.trim(),
      message: message?.trim() ?? "",
      stripMessage: stripMessage?.trim() ?? "",
      link: link?.trim() ?? "",
      linkLabel: linkLabel?.trim() || "View",
      slug: slug?.trim() || createSlug(title),
      status: status || "active",
      iconType: iconType || "announcement",
      orderNumber: orderNumber ?? 0,
    });

    const withPaths = await attachHierarchyPaths([doc]);
    return successResponse(withPaths[0], "Notification created", 201);
  } catch (error) {
    return handleApiError(error, "Failed to create notification");
  }
}
