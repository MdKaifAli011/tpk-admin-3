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
import { createSlug } from "@/utils/serverSlug";
import { regexExactFromSlugSegment } from "@/utils/escapeRegex.js";

async function resolveContextFromSlugs(searchParams) {
  const examSlug = searchParams.get("exam");
  const subjectSlug = searchParams.get("subject");
  const unitSlug = searchParams.get("unit");
  const chapterSlug = searchParams.get("chapter");
  const topicSlug = searchParams.get("topic");
  const subtopicSlug = searchParams.get("subtopic");
  const definitionSlug = searchParams.get("definition");

  const result = { examId: null, subjectId: null, unitId: null, chapterId: null, topicId: null, subTopicId: null, definitionId: null };
  if (!examSlug) return result;

  const exam = await Exam.findOne({ $or: [{ slug: examSlug }, { name: { $regex: regexExactFromSlugSegment(examSlug) } }], status: { $in: ["active", "draft"] } }).lean();
  if (!exam) return result;
  result.examId = exam._id;
  if (!subjectSlug) return result;

  const subject = await Subject.findOne({ examId: exam._id, $or: [{ slug: subjectSlug }, { name: { $regex: regexExactFromSlugSegment(subjectSlug) } }], status: "active" }).lean();
  if (!subject) return result;
  result.subjectId = subject._id;
  if (!unitSlug) return result;

  const unit = await Unit.findOne({ subjectId: subject._id, $or: [{ slug: unitSlug }, { name: { $regex: regexExactFromSlugSegment(unitSlug) } }], status: "active" }).lean();
  if (!unit) return result;
  result.unitId = unit._id;
  if (!chapterSlug) return result;

  const chapter = await Chapter.findOne({ unitId: unit._id, $or: [{ slug: chapterSlug }, { name: { $regex: regexExactFromSlugSegment(chapterSlug) } }], status: "active" }).lean();
  if (!chapter) return result;
  result.chapterId = chapter._id;
  if (!topicSlug) return result;

  const topic = await Topic.findOne({ chapterId: chapter._id, $or: [{ slug: topicSlug }, { name: { $regex: regexExactFromSlugSegment(topicSlug) } }], status: "active" }).lean();
  if (!topic) return result;
  result.topicId = topic._id;
  if (!subtopicSlug) return result;

  const subtopic = await SubTopic.findOne({ topicId: topic._id, $or: [{ slug: subtopicSlug }, { name: { $regex: regexExactFromSlugSegment(subtopicSlug) } }], status: "active" }).lean();
  if (!subtopic) return result;
  result.subTopicId = subtopic._id;
  if (!definitionSlug) return result;

  const definition = await Definition.findOne({ subTopicId: subtopic._id, $or: [{ slug: definitionSlug }, { name: { $regex: regexExactFromSlugSegment(definitionSlug) } }, { term: { $regex: regexExactFromSlugSegment(definitionSlug) } }], status: "active" }).lean();
  if (!definition) return result;
  result.definitionId = definition._id;
  return result;
}

/**
 * GET: Unread count for current student (and optional context).
 * Query: exam, subject, unit, chapter, topic, subtopic, definition (for context).
 * Returns { count }. Requires student token; returns 0 if not logged in.
 */
export async function GET(request) {
  try {
    const student = await verifyStudentToken(request);
    const studentId = student?.studentId || student?.id;
    if (!studentId) {
      return successResponse({ count: 0 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const context = await resolveContextFromSlugs(searchParams);

    const conditions = [];
    if (context.examId) conditions.push({ entityType: "exam", entityId: context.examId });
    if (context.subjectId) conditions.push({ entityType: "subject", entityId: context.subjectId });
    if (context.unitId) conditions.push({ entityType: "unit", entityId: context.unitId });
    if (context.chapterId) conditions.push({ entityType: "chapter", entityId: context.chapterId });
    if (context.topicId) conditions.push({ entityType: "topic", entityId: context.topicId });
    if (context.subTopicId) conditions.push({ entityType: "subtopic", entityId: context.subTopicId });
    if (context.definitionId) conditions.push({ entityType: "definition", entityId: context.definitionId });

    const query = { status: "active" };
    if (conditions.length > 0) query.$or = conditions;
    // Exclude notifications past endDate (header unread count should match header list)
    query.$and = [
      {
        $or: [
          { endDate: null },
          { endDate: { $exists: false } },
          { endDate: { $gte: new Date() } },
        ],
      },
    ];

    const notificationIds = await Notification.find(query).select("_id").lean().then((docs) => docs.map((d) => d._id));
    if (notificationIds.length === 0) {
      return successResponse({ count: 0 });
    }

    const readCount = await NotificationRead.countDocuments({
      studentId: studentId,
      notificationId: { $in: notificationIds },
    });
    const count = Math.max(0, notificationIds.length - readCount);

    return successResponse({ count });
  } catch (error) {
    return handleApiError(error, "Failed to get unread count");
  }
}
