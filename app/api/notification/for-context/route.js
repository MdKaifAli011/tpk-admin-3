import { NextResponse } from "next/server";
import mongoose from "mongoose";
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
import { regexExactFromSlugSegment } from "@/utils/escapeRegex.js";

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
      { name: { $regex: regexExactFromSlugSegment(examSlug) } },
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
      { name: { $regex: regexExactFromSlugSegment(subjectSlug) } },
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
      { name: { $regex: regexExactFromSlugSegment(unitSlug) } },
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
      { name: { $regex: regexExactFromSlugSegment(chapterSlug) } },
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
      { name: { $regex: regexExactFromSlugSegment(topicSlug) } },
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
      { name: { $regex: regexExactFromSlugSegment(subtopicSlug) } },
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
      { name: { $regex: regexExactFromSlugSegment(definitionSlug) } },
      { term: { $regex: regexExactFromSlugSegment(definitionSlug) } },
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

    // Normalize context IDs to ObjectIds so query always matches by exact exam/entity (never another exam)
    const toOid = (id) => (id == null ? null : mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null);
    const examOid = toOid(context.examId);
    const subjectOid = toOid(context.subjectId);
    const unitOid = toOid(context.unitId);
    const chapterOid = toOid(context.chapterId);
    const topicOid = toOid(context.topicId);
    const subTopicOid = toOid(context.subTopicId);
    const definitionOid = toOid(context.definitionId);

    const conditions = [];
    // General: show only when no exam in URL (landing/home). When user is on an exam or exam-child page, do NOT show general — only that exam's (and level's) notifications, so NEET and JEE don't mix.
    if (!examOid) {
      conditions.push({ entityType: "general" });
    }
    // Exam (page only): show only on that exam's own page, not on subject/unit/... under it
    const isExamPageOnly = examOid && !subjectOid && !unitOid && !chapterOid && !topicOid && !subTopicOid && !definitionOid;
    if (isExamPageOnly) conditions.push({ entityType: "exam", entityId: examOid });
    // Exam with children: show on that exam page AND on all its children (subject, unit, chapter, topic, subtopic, definition under that exam)
    if (examOid) conditions.push({ entityType: "exam_with_children", entityId: examOid });
    if (subjectOid) conditions.push({ entityType: "subject", entityId: subjectOid });
    if (unitOid) conditions.push({ entityType: "unit", entityId: unitOid });
    if (chapterOid) conditions.push({ entityType: "chapter", entityId: chapterOid });
    if (topicOid) conditions.push({ entityType: "topic", entityId: topicOid });
    if (subTopicOid) conditions.push({ entityType: "subtopic", entityId: subTopicOid });
    if (definitionOid) conditions.push({ entityType: "definition", entityId: definitionOid });

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
    if (!examOid && !subjectOid && !unitOid && !chapterOid && !topicOid && !subTopicOid && !definitionOid) {
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

    let list = await Notification.find({
      status: "active",
      $or: conditions,
      ...endDateFilter,
    })
      .sort({ orderNumber: 1, createdAt: -1 })
      .limit(limit)
      .lean();

    // Safety: when we have an exam context, never return notifications for a different exam (e.g. JEE on NEET page).
    if (examOid && list.length > 0) {
      const examIdStr = examOid.toString();
      list = list.filter((n) => {
        if (n.entityType === "exam" || n.entityType === "exam_with_children") {
          return n.entityId && n.entityId.toString() === examIdStr;
        }
        return true;
      });
    }

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
