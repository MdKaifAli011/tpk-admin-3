import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import NotificationRead from "@/models/NotificationRead";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
import { successResponse, handleApiError } from "@/utils/apiResponse";
import { verifyStudentToken } from "@/lib/studentAuth";
import { regexExactFromSlugSegment } from "@/utils/escapeRegex.js";

/**
 * Resolve exam slug to examId; optionally resolve level slugs to IDs under that exam.
 * Returns { examId, subjectIds, unitIds, chapterIds, topicIds, subTopicIds, definitionIds } (arrays of ObjectIds).
 */
async function resolveExamAndLevelIds(searchParams) {
  const examSlug = searchParams.get("exam");
  if (!examSlug) return null;

  const exam = await Exam.findOne(
    {
      $or: [
        { slug: examSlug },
        { name: { $regex: regexExactFromSlugSegment(examSlug) } },
      ],
      status: { $in: ["active", "draft"] },
    },
    "_id"
  ).lean();
  if (!exam) return null;

  const examId = exam._id;
  const subjectSlug = searchParams.get("subject");
  const unitSlug = searchParams.get("unit");
  const chapterSlug = searchParams.get("chapter");
  const topicSlug = searchParams.get("topic");
  const subtopicSlug = searchParams.get("subtopic");
  const definitionSlug = searchParams.get("definition");

  const result = {
    examId,
    subjectIds: [],
    unitIds: [],
    chapterIds: [],
    topicIds: [],
    subTopicIds: [],
    definitionIds: [],
  };

  // If no level filter: all entities under this exam
  const [subjects, units, chapters, topics, subtopics, definitions] = await Promise.all([
    Subject.find({ examId }).select("_id").lean(),
    Unit.find({ examId }).select("_id").lean(),
    Chapter.find({ examId }).select("_id").lean(),
    Topic.find({ examId }).select("_id").lean(),
    SubTopic.find({ examId }).select("_id").lean(),
    Definition.find({ examId }).select("_id").lean(),
  ]);

  result.subjectIds = subjects.map((s) => s._id);
  result.unitIds = units.map((u) => u._id);
  result.chapterIds = chapters.map((c) => c._id);
  result.topicIds = topics.map((t) => t._id);
  result.subTopicIds = subtopics.map((s) => s._id);
  result.definitionIds = definitions.map((d) => d._id);

  // If level slugs provided, restrict to that context (only those IDs)
  if (subjectSlug) {
    const subject = await Subject.findOne(
      { examId, $or: [{ slug: subjectSlug }, { name: { $regex: regexExactFromSlugSegment(subjectSlug) } }], status: "active" },
      "_id"
    ).lean();
    if (subject) result.subjectIds = [subject._id];
  }
  if (unitSlug) {
    const unit = await Unit.findOne(
      { examId, $or: [{ slug: unitSlug }, { name: { $regex: regexExactFromSlugSegment(unitSlug) } }], status: "active" },
      "_id"
    ).lean();
    if (unit) result.unitIds = [unit._id];
  }
  if (chapterSlug) {
    const chapter = await Chapter.findOne(
      { examId, $or: [{ slug: chapterSlug }, { name: { $regex: regexExactFromSlugSegment(chapterSlug) } }], status: "active" },
      "_id"
    ).lean();
    if (chapter) result.chapterIds = [chapter._id];
  }
  if (topicSlug) {
    const topic = await Topic.findOne(
      { examId, $or: [{ slug: topicSlug }, { name: { $regex: regexExactFromSlugSegment(topicSlug) } }], status: "active" },
      "_id"
    ).lean();
    if (topic) result.topicIds = [topic._id];
  }
  if (subtopicSlug) {
    const subtopic = await SubTopic.findOne(
      { examId, $or: [{ slug: subtopicSlug }, { name: { $regex: regexExactFromSlugSegment(subtopicSlug) } }], status: "active" },
      "_id"
    ).lean();
    if (subtopic) result.subTopicIds = [subtopic._id];
  }
  if (definitionSlug) {
    const definition = await Definition.findOne(
      { examId, $or: [{ slug: definitionSlug }, { name: { $regex: regexExactFromSlugSegment(definitionSlug) } }, { term: { $regex: regexExactFromSlugSegment(definitionSlug) } }], status: "active" },
      "_id"
    ).lean();
    if (definition) result.definitionIds = [definition._id];
  }

  return result;
}

/**
 * GET: List active notifications for "View all" page.
 * Optional: limit, skip. If student token provided, includes read status.
 * Query param forHeader=1: exclude notifications whose endDate has passed (for header dropdown).
 * Query params exam, subject, unit, chapter, topic, subtopic, definition: filter by exam (and level).
 * When exam=neet (and optional level slugs): only notifications for that exam (and that level) are returned.
 */
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);
    const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10));
    const forHeader = searchParams.get("forHeader") === "1";
    const now = new Date();

    const baseQuery = { status: "active" };
    if (forHeader) {
      baseQuery.$or = [
        { endDate: null },
        { endDate: { $exists: false } },
        { endDate: { $gte: now } },
      ];
    }

    let query = { ...baseQuery };
    const examContext = await resolveExamAndLevelIds(searchParams);
    if (examContext) {
      const levelConditions = [
        { entityType: "general" },
        { entityType: "exam", entityId: examContext.examId },
        { entityType: "exam_with_children", entityId: examContext.examId },
      ];
      if (examContext.subjectIds.length) levelConditions.push({ entityType: "subject", entityId: { $in: examContext.subjectIds } });
      if (examContext.unitIds.length) levelConditions.push({ entityType: "unit", entityId: { $in: examContext.unitIds } });
      if (examContext.chapterIds.length) levelConditions.push({ entityType: "chapter", entityId: { $in: examContext.chapterIds } });
      if (examContext.topicIds.length) levelConditions.push({ entityType: "topic", entityId: { $in: examContext.topicIds } });
      if (examContext.subTopicIds.length) levelConditions.push({ entityType: "subtopic", entityId: { $in: examContext.subTopicIds } });
      if (examContext.definitionIds.length) levelConditions.push({ entityType: "definition", entityId: { $in: examContext.definitionIds } });
      query = {
        status: "active",
        $and: [
          { $or: levelConditions },
          ...(forHeader ? [{ $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: now } }] }] : []),
        ].filter(Boolean),
      };
    }

    const [list, total] = await Promise.all([
      Notification.find(query)
        .sort({ orderNumber: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);

    let readSet = new Set();
    try {
      const student = await verifyStudentToken(request);
      if (student?.id) {
        const readDocs = await NotificationRead.find({
          studentId: student.id,
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

    return successResponse({ data, total });
  } catch (error) {
    return handleApiError(error, "Failed to list notifications");
  }
}
