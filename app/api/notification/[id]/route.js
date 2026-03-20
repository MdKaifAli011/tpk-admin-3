import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import {
  successResponse,
  errorResponse,
  handleApiError,
  notFoundResponse,
} from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";
import mongoose from "mongoose";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";

const ENTITY_TYPES = ["general", "exam", "exam_with_children", "subject", "unit", "chapter", "topic", "subtopic", "definition"];

async function attachHierarchyPath(notification) {
  if (!notification?.entityType) return notification;
  if (notification.entityType === "general") {
    return { ...notification, hierarchyPath: [{ label: "General", name: "All pages" }] };
  }
  if (!notification.entityId) return { ...notification, hierarchyPath: [{ label: notification.entityType, name: "—" }] };
  const id = notification.entityId?._id ? notification.entityId._id.toString() : notification.entityId?.toString();
  const entityType = notification.entityType;
  let path = [];
  try {
    switch (entityType) {
      case "exam":
        const exam = await Exam.findById(id).select("name").lean();
        path = [{ label: "Exam", name: exam?.name || "—" }];
        break;
      case "exam_with_children":
        const examWc = await Exam.findById(id).select("name").lean();
        path = [{ label: "Exam (and children)", name: examWc?.name || "—" }];
        break;
      case "subject":
        const subject = await Subject.findById(id).populate("examId", "name").lean();
        path = [{ label: "Exam", name: subject?.examId?.name || "—" }, { label: "Subject", name: subject?.name || "—" }];
        break;
      case "unit":
        const unit = await Unit.findById(id).populate("subjectId examId", "name").lean();
        path = [{ label: "Exam", name: unit?.examId?.name || "—" }, { label: "Subject", name: unit?.subjectId?.name || "—" }, { label: "Unit", name: unit?.name || "—" }];
        break;
      case "chapter":
        const chapter = await Chapter.findById(id).populate("unitId subjectId examId", "name").lean();
        path = [{ label: "Exam", name: chapter?.examId?.name || "—" }, { label: "Subject", name: chapter?.subjectId?.name || "—" }, { label: "Unit", name: chapter?.unitId?.name || "—" }, { label: "Chapter", name: chapter?.name || "—" }];
        break;
      case "topic":
        const topic = await Topic.findById(id).populate("chapterId unitId subjectId examId", "name").lean();
        path = [{ label: "Exam", name: topic?.examId?.name || "—" }, { label: "Subject", name: topic?.subjectId?.name || "—" }, { label: "Unit", name: topic?.unitId?.name || "—" }, { label: "Chapter", name: topic?.chapterId?.name || "—" }, { label: "Topic", name: topic?.name || "—" }];
        break;
      case "subtopic":
        const subtopic = await SubTopic.findById(id).populate("topicId chapterId unitId subjectId examId", "name").lean();
        path = [{ label: "Exam", name: subtopic?.examId?.name || "—" }, { label: "Subject", name: subtopic?.subjectId?.name || "—" }, { label: "Unit", name: subtopic?.unitId?.name || "—" }, { label: "Chapter", name: subtopic?.chapterId?.name || "—" }, { label: "Topic", name: subtopic?.topicId?.name || "—" }, { label: "SubTopic", name: subtopic?.name || "—" }];
        break;
      case "definition":
        const definition = await Definition.findById(id).populate("subTopicId topicId chapterId unitId subjectId examId", "name").lean();
        path = [{ label: "Exam", name: definition?.examId?.name || "—" }, { label: "Subject", name: definition?.subjectId?.name || "—" }, { label: "Unit", name: definition?.unitId?.name || "—" }, { label: "Chapter", name: definition?.chapterId?.name || "—" }, { label: "Topic", name: definition?.topicId?.name || "—" }, { label: "SubTopic", name: definition?.subTopicId?.name || "—" }, { label: "Definition", name: definition?.name || definition?.term || "—" }];
        break;
      default:
        path = [{ label: entityType, name: "—" }];
    }
  } catch (_) {
    path = [{ label: entityType, name: "—" }];
  }
  return { ...notification, hierarchyPath: path };
}

export async function GET(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid notification ID", 400);
    }

    const notification = await Notification.findById(id).populate("entityId", "name").lean();
    if (!notification) {
      return notFoundResponse("Notification not found");
    }

    const withPath = await attachHierarchyPath(notification);
    return successResponse(withPath);
  } catch (error) {
    return handleApiError(error, "Failed to fetch notification");
  }
}

export async function PUT(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid notification ID", 400);
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return notFoundResponse("Notification not found");
    }

    const allowed = ["title", "message", "stripMessage", "link", "linkLabel", "slug", "status", "iconType", "orderNumber", "entityType", "entityId", "endDate"];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === "entityId") {
          notification.entityId = body[key] == null || body[key] === "" ? null : new mongoose.Types.ObjectId(body[key]);
        } else if (key === "endDate") {
          notification.endDate = body[key] != null && body[key] !== "" ? new Date(body[key]) : null;
        } else {
          notification[key] = body[key];
        }
      }
    }

    await notification.save();
    const populated = await Notification.findById(id).populate("entityId", "name").lean();
    const withPath = await attachHierarchyPath(populated);
    return successResponse(withPath, "Notification updated");
  } catch (error) {
    return handleApiError(error, "Failed to update notification");
  }
}

export async function DELETE(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid notification ID", 400);
    }

    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      return notFoundResponse("Notification not found");
    }

    return successResponse({ deleted: true }, "Notification deleted");
  } catch (error) {
    return handleApiError(error, "Failed to delete notification");
  }
}
