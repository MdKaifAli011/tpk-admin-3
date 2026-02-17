import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import ExamInfo from "@/models/ExamInfo";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import mongoose from "mongoose";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
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
    const subjectIdsFromExamInfo =
      examInfo?.subjects?.map((s) => s.subjectId) || [];

    const subjects = await Subject.find({
      examId,
      _id: { $in: subjectIdsFromExamInfo },
    })
      .sort({ orderNumber: 1 })
      .select("name slug orderNumber")
      .lean();

    const subjectMap = new Map(
      subjects.map((s) => [s._id.toString(), { ...s }]),
    );
    const examInfoBySubject = new Map();
    if (examInfo?.subjects?.length) {
      examInfo.subjects.forEach((s) => {
        const id = s.subjectId?.toString?.() || s.subjectId;
        if (id) examInfoBySubject.set(id, s);
      });
    }

    const units = await Unit.find({ examId })
      .sort({ orderNumber: 1 })
      .select("name slug orderNumber subjectId time weightage")
      .lean();
    const unitIds = units.map((u) => u._id);
    const chapters = await Chapter.find({ unitId: { $in: unitIds } })
      .sort({ orderNumber: 1 })
      .select("name slug orderNumber unitId time weightage questions")
      .lean();
    const chapterIds = chapters.map((c) => c._id);
    const topics = await Topic.find({ chapterId: { $in: chapterIds } })
      .sort({ orderNumber: 1 })
      .select("name slug orderNumber chapterId time weightage")
      .lean();

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
    const hierarchy = [];
    for (const sub of subjects) {
      const sid = sub._id.toString();
      const info = examInfoBySubject.get(sid) || {};
      const subjectUnits =
        units.filter((u) => u.subjectId?.toString() === sid) || [];
      const children = subjectUnits.map((u) => {
        const uid = u._id.toString();
        const unitChapters = chaptersByUnit.get(uid) || [];
        const unitChapterNodes = unitChapters.map((ch) => {
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
            children: chTopics.map((t) => ({
              level: "topic",
              _id: t._id,
              name: t.name,
              time: t.time ?? 0,
              weightage: t.weightage ?? 0,
              orderNumber: t.orderNumber,
              children: [],
            })),
          };
        });
        const unitTime = unitChapterNodes.reduce((s, ch) => s + (Number(ch.time) || 0), 0);
        return {
          level: "unit",
          _id: u._id,
          name: u.name,
          time: unitTime,
          weightage: u.weightage ?? 0,
          orderNumber: u.orderNumber,
          children: unitChapterNodes,
        };
      });
      const subjectTime = children.reduce((sum, u) => sum + (Number(u.time) || 0), 0);
      hierarchy.push({
        level: "subject",
        _id: sub._id,
        name: sub.name,
        numberOfQuestions: info.numberOfQuestions ?? 0,
        maximumMarks: info.maximumMarks ?? 0,
        time: subjectTime,
        weightage: info.weightage ?? null,
        studyHours: subjectTime,
        orderNumber: sub.orderNumber,
        children,
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
    if (node._id && node.level) {
      const entry = {
        _id: node._id,
        level: node.level,
        time: node.time,
        weightage: node.weightage,
        studyHours: node.studyHours,
      };
      if (node.level === "subject") {
        entry.numberOfQuestions = node.numberOfQuestions;
        entry.maximumMarks = node.maximumMarks;
      }
      acc.push(entry);
    }
    if (node.children?.length) flattenHierarchy(node.children, acc);
  }
  return acc;
}

/** Unit time (auto) = sum of chapter times under that unit */
function unitTimeFromHierarchy(nodes) {
  const map = new Map();
  if (!nodes || !Array.isArray(nodes)) return map;
  for (const node of nodes) {
    if (node.level === "subject" && node.children?.length) {
      for (const u of node.children) {
        if (u.level === "unit" && u._id && u.children?.length) {
          const time = u.children.reduce((s, ch) => s + (Number(ch.time) || 0), 0);
          map.set(String(u._id), time);
        }
      }
    }
  }
  return map;
}

/** Subject time (auto) = sum of unit times under that subject */
function subjectTimeFromHierarchy(nodes) {
  const map = new Map();
  if (!nodes || !Array.isArray(nodes)) return map;
  const unitTimes = unitTimeFromHierarchy(nodes);
  for (const node of nodes) {
    if (node.level === "subject" && node._id && node.children?.length) {
      const time = node.children.reduce(
        (sum, u) => sum + (unitTimes.get(String(u._id)) ?? (Number(u.time) || 0)),
        0,
      );
      map.set(String(node._id), time);
    }
  }
  return map;
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
      return errorResponse(
        "Exam info not found. Save exam info (with subjects) first.",
        404,
      );
    }

    const flat = flattenHierarchy(hierarchy);
    const unitTimeComputed = unitTimeFromHierarchy(hierarchy);
    const subjectTimeComputed = subjectTimeFromHierarchy(hierarchy);
    const subjectUpdates = new Map();

    for (const node of flat) {
      const id = node._id;
      if (!id || !mongoose.Types.ObjectId.isValid(id)) continue;
      const weightage =
        node.weightage != null ? Number(node.weightage) : undefined;
      const numberOfQuestions =
        node.numberOfQuestions != null
          ? Number(node.numberOfQuestions)
          : undefined;
      const maximumMarks =
        node.maximumMarks != null ? Number(node.maximumMarks) : undefined;

      if (node.level === "subject") {
        const time = subjectTimeComputed.has(String(id))
          ? subjectTimeComputed.get(String(id))
          : node.time != null
            ? Number(node.time)
            : undefined;
        const studyHours = time;
        subjectUpdates.set(String(id), {
          time,
          weightage,
          studyHours,
          numberOfQuestions,
          maximumMarks,
        });
        continue;
      }
      if (node.level === "unit") {
        const time = unitTimeComputed.has(String(id))
          ? unitTimeComputed.get(String(id))
          : node.time != null
            ? Number(node.time)
            : 0;
        await Unit.findByIdAndUpdate(id, {
          $set: { time: Number(time) || 0, weightage: weightage ?? 0 },
        });
        continue;
      }
      const time = node.time != null ? Number(node.time) : undefined;
      if (node.level === "chapter") {
        await Chapter.findByIdAndUpdate(id, {
          $set: { time: time ?? 0, weightage: weightage ?? 0 },
        });
      } else if (node.level === "topic") {
        await Topic.findByIdAndUpdate(id, {
          $set: { time: time ?? 0, weightage: weightage ?? 0 },
        });
      }
    }

    const totalExamTime = [...subjectTimeComputed.values()].reduce(
      (sum, t) => sum + (Number(t) || 0),
      0,
    );

    const updatePayload = { totalTime: totalExamTime };
    if (subjectUpdates.size > 0 && examInfo.subjects?.length) {
      updatePayload.subjects = examInfo.subjects.map((s) => {
        const sid = String(s.subjectId?._id ?? s.subjectId);
        const u = subjectUpdates.get(sid);
        if (!u) return s;
        return {
          subjectId: s.subjectId?._id ?? s.subjectId,
          subjectName:
            typeof s.subjectName === "string"
              ? s.subjectName
              : (s.subjectId?.name ?? s.subjectName ?? ""),
          numberOfQuestions:
            u.numberOfQuestions !== undefined
              ? u.numberOfQuestions
              : s.numberOfQuestions,
          maximumMarks:
            u.maximumMarks !== undefined ? u.maximumMarks : s.maximumMarks,
          time: u.time !== undefined ? u.time : s.time,
          weightage: u.weightage !== undefined ? u.weightage : s.weightage,
          studyHours: u.studyHours !== undefined ? u.studyHours : s.studyHours,
        };
      });
    }
    await ExamInfo.findByIdAndUpdate(examInfo._id, { $set: updatePayload });

    return successResponse(
      { updated: true },
      "Time & weightage saved for all levels",
    );
  } catch (error) {
    return handleApiError(error, "Failed to save time & weightage");
  }
}
