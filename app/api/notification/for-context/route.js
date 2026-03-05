import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
import { successResponse, handleApiError } from "@/utils/apiResponse";
import { createSlug } from "@/utils/serverSlug";
import NotificationRead from "@/models/NotificationRead";
import { verifyStudentToken } from "@/lib/studentAuth";

/**
 * Resolve URL path slugs to entity IDs.
 * Query params: exam, subject, unit, chapter, topic, subtopic, definition (slugs from URL).
 * Returns { examId, subjectId, unitId, chapterId, topicId, subTopicId, definitionId } (null for missing).
 */
async function resolveContextFromSlugs(searchParams) {
  const examSlug = searchParams.get("exam");
  const subjectSlug = searchParams.get("subject");
  const unitSlug = searchParams.get("unit");
  const chapterSlug = searchParams.get("chapter");
  const topicSlug = searchParams.get("topic");
  const subtopicSlug = searchParams.get("subtopic");
  const definitionSlug = searchParams.get("definition");

  const result = {
    examId: null,
    subjectId: null,
    unitId: null,
    chapterId: null,
    topicId: null,
    subTopicId: null,
    definitionId: null,
  };

  if (!examSlug) return result;

  const exam = await Exam.findOne({
    $or: [
      { slug: examSlug },
      { name: { $regex: new RegExp(`^${examSlug.replace(/-/g, " ")}$`, "i") } },
    ],
    status: { $in: ["active", "draft"] },
  }).lean();
  if (!exam) return result;
  result.examId = exam._id;

  if (!subjectSlug) return result;
  const subject = await Subject.findOne({
    examId: exam._id,
    $or: [
      { slug: subjectSlug },
      { name: { $regex: new RegExp(`^${subjectSlug.replace(/-/g, " ")}$`, "i") } },
    ],
    status: "active",
  }).lean();
  if (!subject) return result;
  result.subjectId = subject._id;

  if (!unitSlug) return result;
  const unit = await Unit.findOne({
    subjectId: subject._id,
    $or: [
      { slug: unitSlug },
      { name: { $regex: new RegExp(`^${unitSlug.replace(/-/g, " ")}$`, "i") } },
    ],
    status: "active",
  }).lean();
  if (!unit) return result;
  result.unitId = unit._id;

  if (!chapterSlug) return result;
  const chapter = await Chapter.findOne({
    unitId: unit._id,
    $or: [
      { slug: chapterSlug },
      { name: { $regex: new RegExp(`^${chapterSlug.replace(/-/g, " ")}$`, "i") } },
    ],
    status: "active",
  }).lean();
  if (!chapter) return result;
  result.chapterId = chapter._id;

  if (!topicSlug) return result;
  const topic = await Topic.findOne({
    chapterId: chapter._id,
    $or: [
      { slug: topicSlug },
      { name: { $regex: new RegExp(`^${topicSlug.replace(/-/g, " ")}$`, "i") } },
    ],
    status: "active",
  }).lean();
  if (!topic) return result;
  result.topicId = topic._id;

  if (!subtopicSlug) return result;
  const subtopic = await SubTopic.findOne({
    topicId: topic._id,
    $or: [
      { slug: subtopicSlug },
      { name: { $regex: new RegExp(`^${subtopicSlug.replace(/-/g, " ")}$`, "i") } },
    ],
    status: "active",
  }).lean();
  if (!subtopic) return result;
  result.subTopicId = subtopic._id;

  if (!definitionSlug) return result;
  const definition = await Definition.findOne({
    subTopicId: subtopic._id,
    $or: [
      { slug: definitionSlug },
      { name: { $regex: new RegExp(`^${definitionSlug.replace(/-/g, " ")}$`, "i") } },
      { term: { $regex: new RegExp(`^${definitionSlug.replace(/-/g, " ")}$`, "i") } },
    ],
    status: "active",
  }).lean();
  if (!definition) return result;
  result.definitionId = definition._id;

  return result;
}

/**
 * GET: Fetch active notifications for the current page context.
 * Query: exam, subject, unit, chapter, topic, subtopic, definition (URL slugs).
 * Returns notifications where (entityType, entityId) matches any of the resolved context.
 */
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const context = await resolveContextFromSlugs(searchParams);

    const conditions = [];
    // General: show on every page (all exams and all their children)
    conditions.push({ entityType: "general" });
    // Exam (page only): show only on that exam's own page, not on subject/unit/... under it
    const isExamPageOnly = context.examId && !context.subjectId && !context.unitId && !context.chapterId && !context.topicId && !context.subTopicId && !context.definitionId;
    if (isExamPageOnly) conditions.push({ entityType: "exam", entityId: context.examId });
    // Exam with children: show on that exam page AND on all its children (subject, unit, chapter, topic, subtopic, definition under that exam)
    if (context.examId) conditions.push({ entityType: "exam_with_children", entityId: context.examId });
    if (context.subjectId) conditions.push({ entityType: "subject", entityId: context.subjectId });
    if (context.unitId) conditions.push({ entityType: "unit", entityId: context.unitId });
    if (context.chapterId) conditions.push({ entityType: "chapter", entityId: context.chapterId });
    if (context.topicId) conditions.push({ entityType: "topic", entityId: context.topicId });
    if (context.subTopicId) conditions.push({ entityType: "subtopic", entityId: context.subTopicId });
    if (context.definitionId) conditions.push({ entityType: "definition", entityId: context.definitionId });

    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    // Exclude notifications that have passed their endDate (header should not show them)
    const endDateFilter = {
      $or: [
        { endDate: null },
        { endDate: { $exists: false } },
        { endDate: { $gte: new Date() } },
      ],
    };

    // No context (e.g. main/landing page): return general only (no exam selected yet)
    if (context.examId == null && context.subjectId == null && context.unitId == null && context.chapterId == null && context.topicId == null && context.subTopicId == null && context.definitionId == null) {
      const list = await Notification.find({
        status: "active",
        entityType: "general",
        ...endDateFilter,
      })
        .sort({ orderNumber: 1, createdAt: -1 })
        .limit(limit)
        .lean();
      let readSet = new Set();
      try {
        const student = await verifyStudentToken(request);
        if ((student?.studentId || student?.id) && list.length > 0) {
          const sid = student.studentId || student.id;
          const readDocs = await NotificationRead.find({
            studentId: sid,
            notificationId: { $in: list.map((n) => n._id) },
          })
            .select("notificationId")
            .lean();
          readDocs.forEach((r) => readSet.add(r.notificationId.toString()));
        }
      } catch (_) {}
      const data = list.map((n) => ({
        ...n,
        read: readSet.has(n._id.toString()),
      }));
      return successResponse({ data });
    }
    const forStrip = searchParams.get("strip") === "1";

    const list = await Notification.find({
      status: "active",
      $or: conditions,
      ...endDateFilter,
    })
      .sort({ orderNumber: 1, createdAt: -1 })
      .limit(limit)
      .lean();

    let readSet = new Set();
    try {
      const student = await verifyStudentToken(request);
      if ((student?.studentId || student?.id) && list.length > 0) {
        const sid = student.studentId || student.id;
        const readDocs = await NotificationRead.find({
          studentId: sid,
          notificationId: { $in: list.map((n) => n._id) },
        })
          .select("notificationId")
          .lean();
        readDocs.forEach((r) => readSet.add(r.notificationId.toString()));
      }
    } catch (_) {}

    const data = list.map((n) => ({
      ...n,
      read: readSet.has(n._id.toString()),
    }));

    return successResponse({ data });
  } catch (error) {
    return handleApiError(error, "Failed to fetch notifications for context");
  }
}
