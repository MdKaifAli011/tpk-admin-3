import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import mongoose from "mongoose";
import { STATUS } from "@/constants";

/**
 * Build status query for tree filters.
 * When "active", include docs with missing/null status so newly created or cloned data shows.
 * @param {string} statusFilter - "active" | "inactive" | "all"
 * @returns {object} Mongo query for status
 */
function buildStatusQuery(statusFilter) {
  const normalized = (statusFilter || STATUS.ACTIVE).toLowerCase();
  if (normalized === "all") return {};
  if (normalized === STATUS.ACTIVE) {
    return {
      $or: [
        { status: { $regex: new RegExp(`^${normalized}$`, "i") } },
        { status: { $exists: false } },
        { status: null },
        { status: "" },
      ],
    };
  }
  return { status: { $regex: new RegExp(`^${normalized}$`, "i") } };
}

/**
 * Fetch all tree data from DB and build the hierarchy.
 * Same logic as GET /api/tree. Caller can use for JSON response or file export.
 * @param {string} [statusFilter="active"] - "active" | "inactive" | "all"
 * @param {string} [examIdParam] - Optional exam ID to filter by one exam
 * @returns {{ tree: array, filters: { status: string, examId: string|null } }}
 */
export async function fetchAndBuildTree(statusFilter = STATUS.ACTIVE, examIdParam = null) {
  await connectDB();

  const statusQuery = buildStatusQuery(statusFilter);
  let examQuery = {};
  if (examIdParam) {
    if (!mongoose.Types.ObjectId.isValid(examIdParam)) {
      const err = new Error("Invalid examId");
      err.status = 400;
      throw err;
    }
    examQuery = { _id: new mongoose.Types.ObjectId(examIdParam) };
  }

  const exams = await Exam.find({ ...examQuery, ...statusQuery })
    .select("_id name slug status orderNumber")
    .sort({ orderNumber: 1, createdAt: -1 })
    .lean();

  if (exams.length === 0) {
    return { tree: [], filters: { status: statusFilter, examId: examIdParam || null } };
  }

  const examIds = exams.map((e) => e._id);

  const subjects = await Subject.find({ examId: { $in: examIds }, ...statusQuery })
    .select("_id name slug orderNumber examId status")
    .sort({ orderNumber: 1, createdAt: -1 })
    .lean();

  const subjectIds = subjects.map((s) => s._id);

  const units = await Unit.find({ subjectId: { $in: subjectIds }, ...statusQuery })
    .select("_id name slug orderNumber subjectId examId status")
    .sort({ orderNumber: 1, createdAt: -1 })
    .lean();

  const unitIds = units.map((u) => u._id);

  const chapters = await Chapter.find({ unitId: { $in: unitIds }, ...statusQuery })
    .select("_id name slug orderNumber unitId subjectId examId status weightage time questions")
    .sort({ orderNumber: 1, createdAt: -1 })
    .lean();

  const chapterIds = chapters.map((c) => c._id);

  const topics = await Topic.find({ chapterId: { $in: chapterIds }, ...statusQuery })
    .select("_id name slug orderNumber chapterId unitId subjectId examId status")
    .sort({ orderNumber: 1, createdAt: -1 })
    .lean();

  const topicIds = topics.map((t) => t._id);

  const subTopics = await SubTopic.find({ topicId: { $in: topicIds }, ...statusQuery })
    .select("_id name slug orderNumber topicId chapterId unitId subjectId examId status")
    .sort({ orderNumber: 1, createdAt: -1 })
    .lean();

  const subjectsByExam = {};
  const unitsBySubject = {};
  const chaptersByUnit = {};
  const topicsByChapter = {};
  const subTopicsByTopic = {};

  subjects.forEach((subject) => {
    const key = subject.examId.toString();
    if (!subjectsByExam[key]) subjectsByExam[key] = [];
    subjectsByExam[key].push(subject);
  });
  units.forEach((unit) => {
    const key = unit.subjectId.toString();
    if (!unitsBySubject[key]) unitsBySubject[key] = [];
    unitsBySubject[key].push(unit);
  });
  chapters.forEach((chapter) => {
    const key = chapter.unitId.toString();
    if (!chaptersByUnit[key]) chaptersByUnit[key] = [];
    chaptersByUnit[key].push(chapter);
  });
  topics.forEach((topic) => {
    const key = topic.chapterId.toString();
    if (!topicsByChapter[key]) topicsByChapter[key] = [];
    topicsByChapter[key].push(topic);
  });
  subTopics.forEach((st) => {
    const key = st.topicId.toString();
    if (!subTopicsByTopic[key]) subTopicsByTopic[key] = [];
    subTopicsByTopic[key].push(st);
  });

  const tree = exams.map((exam) => {
    const examKey = exam._id.toString();
    const examSubjects = subjectsByExam[examKey] || [];
    return {
      ...exam,
      subjects: examSubjects.map((subject) => {
        const subjectKey = subject._id.toString();
        const subjectUnits = unitsBySubject[subjectKey] || [];
        return {
          ...subject,
          units: subjectUnits.map((unit) => {
            const unitKey = unit._id.toString();
            const unitChapters = chaptersByUnit[unitKey] || [];
            return {
              ...unit,
              chapters: unitChapters.map((chapter) => {
                const chapterKey = chapter._id.toString();
                const chapterTopics = topicsByChapter[chapterKey] || [];
                return {
                  ...chapter,
                  topics: chapterTopics.map((topic) => {
                    const topicKey = topic._id.toString();
                    return {
                      ...topic,
                      subTopics: subTopicsByTopic[topicKey] || [],
                    };
                  }),
                };
              }),
            };
          }),
        };
      }),
    };
  });

  return {
    tree,
    filters: { status: statusFilter, examId: examIdParam || null },
  };
}
