import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import ExamInfo from "@/models/ExamInfo";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import mongoose from "mongoose";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";

/**
 * GET /api/admin/exam-hierarchy?examId=...
 * Returns full hierarchy for an exam: Subject → Unit → Chapter → Topic
 * with name, time, weightage at each level (for Time & Weightage management UI).
 */
export async function GET(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");

    if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
      return errorResponse("Valid examId is required", 400);
    }

    const exam = await Exam.findById(examId).select("name slug").lean();
    if (!exam) {
      return errorResponse("Exam not found", 404);
    }

    const examInfo = await ExamInfo.findOne({ examId }).lean();
    const subjectIdsFromExamInfo = examInfo?.subjects?.map((s) => s.subjectId) || [];

    const subjects = await Subject.find({ examId, _id: { $in: subjectIdsFromExamInfo } })
      .sort({ orderNumber: 1 })
      .select("name slug orderNumber")
      .lean();

    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), { ...s }]));
    const examInfoBySubject = new Map();
    if (examInfo?.subjects?.length) {
      examInfo.subjects.forEach((s) => {
        const id = s.subjectId?.toString?.() || s.subjectId;
        if (id) examInfoBySubject.set(id, s);
      });
    }

    const units = await Unit.find({ examId }).sort({ orderNumber: 1 }).select("name slug orderNumber subjectId time weightage").lean();
    const unitIds = units.map((u) => u._id);
    const chapters = await Chapter.find({ unitId: { $in: unitIds } }).sort({ orderNumber: 1 }).select("name slug orderNumber unitId time weightage questions").lean();
    const chapterIds = chapters.map((c) => c._id);
    const topics = await Topic.find({ chapterId: { $in: chapterIds } }).sort({ orderNumber: 1 }).select("name slug orderNumber chapterId time weightage").lean();
    const topicIds = topics.map((t) => t._id);
    const subtopics = await SubTopic.find({ topicId: { $in: topicIds } }).sort({ orderNumber: 1 }).select("name slug orderNumber topicId time weightage").lean();
    const subtopicIds = subtopics.map((st) => st._id);
    const definitions = await Definition.find({ subTopicId: { $in: subtopicIds } }).sort({ orderNumber: 1 }).select("name slug orderNumber subTopicId time weightage").lean();

    const chaptersByUnit = new Map();
    chapters.forEach((c) => {
      const key = c.unitId?.toString?.();
      if (!chaptersByUnit.has(key)) chaptersByUnit.set(key, []);
      chaptersByUnit.get(key).push(c);
    });
    const topicsByChapter = new Map();
    topics.forEach((t) => {
      const key = t.chapterId?.toString?.();
      if (!topicsByChapter.has(key)) topicsByChapter.set(key, []);
      topicsByChapter.get(key).push(t);
    });
    const subtopicsByTopic = new Map();
    subtopics.forEach((st) => {
      const key = st.topicId?.toString?.();
      if (!subtopicsByTopic.has(key)) subtopicsByTopic.set(key, []);
      subtopicsByTopic.get(key).push(st);
    });
    const definitionsBySubTopic = new Map();
    definitions.forEach((d) => {
      const key = d.subTopicId?.toString?.();
      if (!definitionsBySubTopic.has(key)) definitionsBySubTopic.set(key, []);
      definitionsBySubTopic.get(key).push(d);
    });

    const hierarchy = [];
    for (const sub of subjects) {
      const sid = sub._id.toString();
      const info = examInfoBySubject.get(sid) || {};
      hierarchy.push({
        level: "subject",
        _id: sub._id,
        name: sub.name,
        time: info.time ?? null,
        weightage: info.weightage ?? null,
        studyHours: info.studyHours ?? null,
        orderNumber: sub.orderNumber,
        children: (units.filter((u) => u.subjectId?.toString() === sid) || []).map((u) => {
          const uid = u._id.toString();
          const unitChapters = chaptersByUnit.get(uid) || [];
          return {
            level: "unit",
            _id: u._id,
            name: u.name,
            time: u.time ?? 0,
            weightage: u.weightage ?? 0,
            orderNumber: u.orderNumber,
            children: unitChapters.map((ch) => {
              const cid = ch._id.toString();
              const chTopics = topicsByChapter.get(cid) || [];
              return {
                level: "chapter",
                _id: ch._id,
                name: ch.name,
                time: ch.time ?? 0,
                weightage: ch.weightage ?? 0,
                questions: ch.questions ?? 0,
                orderNumber: ch.orderNumber,
                children: chTopics.map((t) => {
                  const tid = t._id.toString();
                  const tSubtopics = subtopicsByTopic.get(tid) || [];
                  return {
                    level: "topic",
                    _id: t._id,
                    name: t.name,
                    time: t.time ?? 0,
                    weightage: t.weightage ?? 0,
                    orderNumber: t.orderNumber,
                    children: tSubtopics.map((st) => {
                      const stid = st._id.toString();
                      const stDefs = definitionsBySubTopic.get(stid) || [];
                      return {
                        level: "subtopic",
                        _id: st._id,
                        name: st.name,
                        time: st.time ?? 0,
                        weightage: st.weightage ?? 0,
                        orderNumber: st.orderNumber,
                        children: stDefs.map((d) => ({
                          level: "definition",
                          _id: d._id,
                          name: d.name,
                          time: d.time ?? 0,
                          weightage: d.weightage ?? 0,
                          orderNumber: d.orderNumber,
                          children: [],
                        })),
                      };
                    }),
                  };
                }),
              };
            }),
          };
        }),
      });
    }

    return successResponse({
      exam: { _id: exam._id, name: exam.name, slug: exam.slug },
      examInfoId: examInfo?._id ?? null,
      hierarchy,
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch exam hierarchy");
  }
}

/** Recursively collect all nodes (flatten) with level and _id for updates */
function flattenHierarchy(nodes, acc = []) {
  if (!nodes || !Array.isArray(nodes)) return acc;
  for (const node of nodes) {
    if (node._id && node.level) acc.push({ _id: node._id, level: node.level, time: node.time, weightage: node.weightage, studyHours: node.studyHours });
    if (node.children?.length) flattenHierarchy(node.children, acc);
  }
  return acc;
}

/**
 * PUT /api/admin/exam-hierarchy
 * Body: { examId, hierarchy } — updates time/weightage/studyHours for all levels in one go.
 */
export async function PUT(request) {
  try {
    const authCheck = await requireAction(request, "PUT");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const body = await request.json();
    const { examId, hierarchy } = body;

    if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
      return errorResponse("Valid examId is required", 400);
    }
    if (!hierarchy || !Array.isArray(hierarchy)) {
      return errorResponse("hierarchy array is required", 400);
    }

    const examInfo = await ExamInfo.findOne({ examId }).lean();
    if (!examInfo) {
      return errorResponse("Exam info not found. Save exam info (with subjects) first.", 404);
    }

    const flat = flattenHierarchy(hierarchy);
    const subjectUpdates = new Map();

    for (const node of flat) {
      const id = node._id;
      if (!id || !mongoose.Types.ObjectId.isValid(id)) continue;
      const time = node.time != null ? Number(node.time) : undefined;
      const weightage = node.weightage != null ? Number(node.weightage) : undefined;
      const studyHours = node.studyHours != null ? Number(node.studyHours) : undefined;

      if (node.level === "subject") {
        subjectUpdates.set(String(id), { time, weightage, studyHours });
        continue;
      }
      if (node.level === "unit") {
        await Unit.findByIdAndUpdate(id, { $set: { time: time ?? 0, weightage: weightage ?? 0 } });
      } else if (node.level === "chapter") {
        await Chapter.findByIdAndUpdate(id, { $set: { time: time ?? 0, weightage: weightage ?? 0 } });
      } else if (node.level === "topic") {
        await Topic.findByIdAndUpdate(id, { $set: { time: time ?? 0, weightage: weightage ?? 0 } });
      } else if (node.level === "subtopic") {
        await SubTopic.findByIdAndUpdate(id, { $set: { time: time ?? 0, weightage: weightage ?? 0 } });
      } else if (node.level === "definition") {
        await Definition.findByIdAndUpdate(id, { $set: { time: time ?? 0, weightage: weightage ?? 0 } });
      }
    }

    if (subjectUpdates.size > 0 && examInfo.subjects?.length) {
      const subjects = examInfo.subjects.map((s) => {
        const sid = String(s.subjectId);
        const u = subjectUpdates.get(sid);
        if (!u) return s;
        return {
          ...s,
          time: u.time !== undefined ? u.time : s.time,
          weightage: u.weightage !== undefined ? u.weightage : s.weightage,
          studyHours: u.studyHours !== undefined ? u.studyHours : s.studyHours,
        };
      });
      await ExamInfo.findByIdAndUpdate(examInfo._id, { $set: { subjects } });
    }

    return successResponse({ updated: true }, "Time & weightage saved for all levels");
  } catch (error) {
    return handleApiError(error, "Failed to save time & weightage");
  }
}
