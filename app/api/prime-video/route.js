import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ContentVideo from "@/models/ContentVideo";

export const dynamic = "force-dynamic";

/**
 * GET /api/prime-video
 * Returns all YouTube/Shorts videos from editor content, grouped by hierarchy.
 * One call, no parsing of long content (videos are synced at save time).
 */
export async function GET() {
  try {
    await connectDB();

    const docs = await ContentVideo.find({})
      .sort({ examName: 1, subjectName: 1, unitName: 1, chapterName: 1, topicName: 1, subTopicName: 1, definitionName: 1 })
      .lean();

    const pathMap = new Map();
    for (const d of docs) {
      const pathKey = [
        d.examId?.toString(),
        d.subjectId?.toString() ?? "",
        d.unitId?.toString() ?? "",
        d.chapterId?.toString() ?? "",
        d.topicId?.toString() ?? "",
        d.subTopicId?.toString() ?? "",
        d.definitionId?.toString() ?? "",
      ].join("|");

      if (!pathMap.has(pathKey)) {
        const pathParts = [
          d.examName,
          d.subjectName,
          d.unitName,
          d.chapterName,
          d.topicName,
          d.subTopicName,
          d.definitionName,
        ].filter(Boolean);
        pathMap.set(pathKey, {
          level: d.level,
          itemId: d.itemId,
          examId: d.examId,
          examName: d.examName ?? "",
          subjectId: d.subjectId,
          subjectName: d.subjectName ?? "",
          unitId: d.unitId,
          unitName: d.unitName ?? "",
          chapterId: d.chapterId,
          chapterName: d.chapterName ?? "",
          topicId: d.topicId,
          topicName: d.topicName ?? "",
          subTopicId: d.subTopicId,
          subTopicName: d.subTopicName ?? "",
          definitionId: d.definitionId,
          definitionName: d.definitionName ?? "",
          pathLabel: pathParts.join(" → "),
          pathParts,
          videos: [],
        });
      }
      const node = pathMap.get(pathKey);
      node.videos.push({
        youtubeVideoId: d.youtubeVideoId,
        embedUrl: d.embedUrl,
      });
    }

    const nodes = Array.from(pathMap.values());
    const exams = buildTree(nodes);
    return NextResponse.json({ success: true, data: { exams, nodes } });
  } catch (error) {
    console.error("[prime-video]", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Failed to fetch prime video" },
      { status: 500 }
    );
  }
}

function buildTree(nodes) {
  const byExam = new Map();
  const bySubject = new Map();
  const byUnit = new Map();
  const byChapter = new Map();
  const byTopic = new Map();
  const bySubTopic = new Map();

  // Ensure ancestor entries exist for every node so videos at any level (e.g. topic only) still show under their exam.
  function ensureAncestors(n) {
    const eid = n.examId?.toString();
    const sid = n.subjectId?.toString();
    const uid = n.unitId?.toString();
    const cid = n.chapterId?.toString();
    const tid = n.topicId?.toString();
    const stid = n.subTopicId?.toString();
    if (!eid) return;
    if (!byExam.has(eid)) byExam.set(eid, { id: n.examId, name: n.examName, slug: slugify(n.examName), videos: [], subjects: [] });
    if (sid && !bySubject.has(`${eid}|${sid}`)) bySubject.set(`${eid}|${sid}`, { id: n.subjectId, name: n.subjectName, slug: slugify(n.subjectName), examId: eid, videos: [], units: [] });
    if (uid && !byUnit.has(`${eid}|${sid}|${uid}`)) byUnit.set(`${eid}|${sid}|${uid}`, { id: n.unitId, name: n.unitName, examId: eid, subjectId: sid, videos: [], chapters: [] });
    if (cid && !byChapter.has(`${eid}|${sid}|${uid}|${cid}`)) byChapter.set(`${eid}|${sid}|${uid}|${cid}`, { id: n.chapterId, name: n.chapterName, examId: eid, subjectId: sid, unitId: uid, videos: [], topics: [] });
    if (tid && !byTopic.has(`${eid}|${sid}|${uid}|${cid}|${tid}`)) byTopic.set(`${eid}|${sid}|${uid}|${cid}|${tid}`, { id: n.topicId, name: n.topicName, examId: eid, subjectId: sid, unitId: uid, chapterId: cid, videos: [], subtopics: [] });
    if (stid && !bySubTopic.has(`${eid}|${sid}|${uid}|${cid}|${tid}|${stid}`)) bySubTopic.set(`${eid}|${sid}|${uid}|${cid}|${tid}|${stid}`, { id: n.subTopicId, name: n.subTopicName, examId: eid, subjectId: sid, unitId: uid, chapterId: cid, topicId: tid, videos: [], definitions: [] });
  }

  for (const n of nodes) {
    ensureAncestors(n);
    const eid = n.examId?.toString();
    const sid = n.subjectId?.toString();
    const uid = n.unitId?.toString();
    const cid = n.chapterId?.toString();
    const tid = n.topicId?.toString();
    const stid = n.subTopicId?.toString();

    if (n.level === "exam" && eid) {
      byExam.get(eid).videos.push(...n.videos);
    } else if (n.level === "subject" && eid && sid) {
      bySubject.get(`${eid}|${sid}`).videos.push(...n.videos);
    } else if (n.level === "unit" && eid && sid && uid) {
      byUnit.get(`${eid}|${sid}|${uid}`).videos.push(...n.videos);
    } else if (n.level === "chapter" && eid && sid && uid && cid) {
      byChapter.get(`${eid}|${sid}|${uid}|${cid}`).videos.push(...n.videos);
    } else if (n.level === "topic" && eid && sid && uid && cid && tid) {
      byTopic.get(`${eid}|${sid}|${uid}|${cid}|${tid}`).videos.push(...n.videos);
    } else if (n.level === "subtopic" && eid && sid && uid && cid && tid && stid) {
      bySubTopic.get(`${eid}|${sid}|${uid}|${cid}|${tid}|${stid}`).videos.push(...n.videos);
    } else if (n.level === "definition") {
      const defKey = `${eid}|${sid}|${uid}|${cid}|${tid}|${stid}`;
      ensureAncestors(n);
      const st = bySubTopic.get(defKey);
      if (st) st.definitions.push({ id: n.definitionId, name: n.definitionName, pathLabel: n.pathLabel, videos: n.videos });
    }
  }

  const examList = [];
  for (const [eid, exam] of byExam) {
    const subjects = [];
    for (const [key, sub] of bySubject) {
      if (sub.examId !== eid) continue;
      const units = [];
      for (const [ukey, u] of byUnit) {
        if (u.examId !== eid || u.subjectId !== sub.id?.toString()) continue;
        const chapters = [];
        for (const [ckey, c] of byChapter) {
          if (c.unitId !== u.id?.toString()) continue;
          const topics = [];
          for (const [tkey, t] of byTopic) {
            if (t.chapterId !== c.id?.toString()) continue;
            const subtopics = [];
            for (const [stkey, st] of bySubTopic) {
              if (st.topicId !== t.id?.toString()) continue;
              subtopics.push({ ...st, pathLabel: [exam.name, sub.name, u.name, c.name, t.name, st.name].filter(Boolean).join(" → ") });
            }
            topics.push({ ...t, pathLabel: [exam.name, sub.name, u.name, c.name, t.name].filter(Boolean).join(" → "), subtopics });
          }
          chapters.push({ ...c, pathLabel: [exam.name, sub.name, u.name, c.name].filter(Boolean).join(" → "), topics });
        }
        units.push({ ...u, pathLabel: [exam.name, sub.name, u.name].filter(Boolean).join(" → "), chapters });
      }
      subjects.push({ ...sub, pathLabel: [exam.name, sub.name].filter(Boolean).join(" → "), units });
    }
    examList.push({ ...exam, subjects });
  }
  return examList;
}

function slugify(s) {
  if (!s) return "";
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
