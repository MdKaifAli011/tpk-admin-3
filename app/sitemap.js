/**
 * Dynamic sitemap for testprepkart.com/self-study
 * Served at: https://testprepkart.com/self-study/sitemap.xml
 *
 * Includes:
 * - Static routes, store, store products
 * - Exams, courses, pages (site + exam-level)
 * - Content hierarchy (exam → subject → unit → chapter → topic → subtopic → definition)
 *   with tab variants: overview, discussion, practice, performance
 * - Discussion thread detail URLs (?tab=discussion&thread=slug)
 * - Practice test detail URLs (?tab=practice&test=id)
 * - Blog, blog category, blog post; Download (exam + top-level folders); Video library; Notifications
 */

import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
import Course from "@/models/Course";
import Page from "@/models/Page";
import Thread from "@/models/Thread";
import PracticeCategory from "@/models/PracticeCategory";
import PracticeSubCategory from "@/models/PracticeSubCategory";
import Blog from "@/models/Blog";
import BlogCategory from "@/models/BlogCategory";
import DownloadFolder from "@/models/DownloadFolder";
import Notification from "@/models/Notification";
import { STATUS } from "@/constants";
import { regexExactInsensitive } from "@/utils/escapeRegex.js";
import { createSlug } from "@/utils/serverSlug";
import { STORE_PRODUCTS } from "@/app/(main)/store/storeData";

export const revalidate = 3600; // revalidate every hour

const BASE_PATH = "/self-study";
const SITE_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://testprepkart.com";

const origin = SITE_BASE.replace(/\/$/, "");
const baseUrl = `${origin}${BASE_PATH}`;

const TAB_VARIANTS = ["discussion", "practice", "performance"];

/** Strip XML 1.0 invalid control characters (except tab, newline, carriage return) from a string */
function stripInvalidXmlChars(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

/** Escape URL for use inside XML <loc> so ampersands etc. are valid (e.g. ?a=1&b=2 → &amp;) */
function escapeUrlForXml(urlString) {
  if (typeof urlString !== "string") return urlString;
  const cleaned = stripInvalidXmlChars(urlString);
  return cleaned
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Ensure lastModified is a valid Date for sitemap (invalid dates can break XML) */
function safeLastModified(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function url(path, query = null) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const pathPart = p === "/" ? "" : p;
  const full = `${baseUrl}${pathPart}`;
  if (query && typeof query === "object" && Object.keys(query).length > 0) {
    const params = new URLSearchParams(query);
    return `${full}?${params.toString()}`;
  }
  return full;
}

function entry(path, options = {}) {
  const query = options.query || null;
  const rawUrl = url(path, query);
  const escapedUrl = escapeUrlForXml(rawUrl);
  if (!escapedUrl || escapedUrl.length === 0) return null;
  return {
    url: escapedUrl,
    lastModified: safeLastModified(options.lastModified),
    changeFrequency: options.changeFrequency || "weekly",
    priority: options.priority ?? 0.8,
  };
}

/** Build content hierarchy paths: one canonical URL + tab variants (discussion, practice, performance) */
function addContentPathsWithTabs(routes, pathSegments, priority = 0.75) {
  const path = "/" + pathSegments.filter(Boolean).join("/");
  if (!path || path === "/") return;
  routes.push(entry(path, { priority, changeFrequency: "weekly" }));
  for (const tab of TAB_VARIANTS) {
    routes.push(
      entry(path, {
        query: { tab },
        priority: priority - 0.02,
        changeFrequency: "weekly",
      })
    );
  }
}

export default async function sitemap() {
  const routes = [];

  // --- Static routes ---
  routes.push(entry("/", { priority: 1, changeFrequency: "daily" }));
  routes.push(entry("/login", { priority: 0.5, changeFrequency: "monthly" }));
  routes.push(entry("/register", { priority: 0.6, changeFrequency: "monthly" }));
  routes.push(entry("/store", { priority: 0.8, changeFrequency: "weekly" }));
  routes.push(entry("/notification", { priority: 0.6, changeFrequency: "daily" }));

  // --- Store product pages ---
  for (const product of STORE_PRODUCTS) {
    if (product?.id) {
      routes.push(
        entry(`/store/${product.id}`, {
          changeFrequency: "weekly",
          priority: 0.7,
        })
      );
    }
  }

  try {
    await connectDB();

    const statusActive = { $regex: regexExactInsensitive(STATUS.ACTIVE) };

    // --- Active exams ---
    const exams = await Exam.find({ status: statusActive })
      .select("name slug _id")
      .sort({ orderNumber: 1 })
      .lean();

    const examSlugMap = new Map();
    for (const exam of exams) {
      const slug = exam.slug || createSlug(exam.name);
      examSlugMap.set(exam._id.toString(), slug);
      addContentPathsWithTabs(routes, [slug], 0.88);
      routes.push(
        entry(`/${slug}/course`, { priority: 0.85, changeFrequency: "weekly" })
      );
      routes.push(
        entry(`/${slug}/blog`, { priority: 0.8, changeFrequency: "weekly" })
      );
      routes.push(
        entry(`/${slug}/download`, { priority: 0.75, changeFrequency: "weekly" })
      );
      routes.push(
        entry(`/${slug}/video-library`, {
          priority: 0.75,
          changeFrequency: "weekly",
        })
      );
    }

    // --- Content hierarchy: subject → unit → chapter → topic → subtopic → definition ---
    const subjects = await Subject.find({
      examId: { $in: exams.map((e) => e._id) },
      status: statusActive,
    })
      .select("_id name slug examId")
      .sort({ orderNumber: 1 })
      .lean();
    const subjectSlugMap = new Map();
    const subjectsByExam = new Map();
    for (const s of subjects) {
      const slug = s.slug || createSlug(s.name);
      subjectSlugMap.set(s._id.toString(), { slug, examId: s.examId?.toString() });
      const eid = s.examId?.toString();
      if (!subjectsByExam.has(eid)) subjectsByExam.set(eid, []);
      subjectsByExam.get(eid).push(s);
    }

    const units = await Unit.find({
      subjectId: { $in: subjects.map((s) => s._id) },
      status: statusActive,
    })
      .select("_id name slug subjectId")
      .sort({ orderNumber: 1 })
      .lean();
    const unitSlugMap = new Map();
    const unitsBySubject = new Map();
    for (const u of units) {
      const slug = u.slug || createSlug(u.name);
      unitSlugMap.set(u._id.toString(), slug);
      const sid = u.subjectId?.toString();
      if (!unitsBySubject.has(sid)) unitsBySubject.set(sid, []);
      unitsBySubject.get(sid).push(u);
    }

    const chapters = await Chapter.find({
      unitId: { $in: units.map((u) => u._id) },
      status: statusActive,
    })
      .select("_id name slug unitId")
      .sort({ orderNumber: 1 })
      .lean();
    const chapterSlugMap = new Map();
    const chaptersByUnit = new Map();
    for (const c of chapters) {
      const slug = c.slug || createSlug(c.name);
      chapterSlugMap.set(c._id.toString(), slug);
      const uid = c.unitId?.toString();
      if (!chaptersByUnit.has(uid)) chaptersByUnit.set(uid, []);
      chaptersByUnit.get(uid).push(c);
    }

    const topics = await Topic.find({
      chapterId: { $in: chapters.map((c) => c._id) },
      status: statusActive,
    })
      .select("_id name slug chapterId")
      .sort({ orderNumber: 1 })
      .lean();
    const topicSlugMap = new Map();
    const topicsByChapter = new Map();
    for (const t of topics) {
      const slug = t.slug || createSlug(t.name);
      topicSlugMap.set(t._id.toString(), slug);
      const cid = t.chapterId?.toString();
      if (!topicsByChapter.has(cid)) topicsByChapter.set(cid, []);
      topicsByChapter.get(cid).push(t);
    }

    const subTopics = await SubTopic.find({
      topicId: { $in: topics.map((t) => t._id) },
      status: statusActive,
    })
      .select("_id name slug topicId")
      .sort({ orderNumber: 1 })
      .lean();
    const subTopicSlugMap = new Map();
    const subTopicsByTopic = new Map();
    for (const st of subTopics) {
      const slug = st.slug || createSlug(st.name);
      subTopicSlugMap.set(st._id.toString(), slug);
      const tid = st.topicId?.toString();
      if (!subTopicsByTopic.has(tid)) subTopicsByTopic.set(tid, []);
      subTopicsByTopic.get(tid).push(st);
    }

    const definitions = await Definition.find({
      subTopicId: { $in: subTopics.map((st) => st._id) },
    })
      .select("_id name slug subTopicId")
      .lean();
    const definitionSlugMap = new Map();
    const definitionsBySubTopic = new Map();
    for (const d of definitions) {
      const slug = d.slug || createSlug(d.name);
      definitionSlugMap.set(d._id.toString(), slug);
      const stid = d.subTopicId?.toString();
      if (!definitionsBySubTopic.has(stid)) definitionsBySubTopic.set(stid, []);
      definitionsBySubTopic.get(stid).push(d);
    }

    // Build paths and add tab variants
    for (const exam of exams) {
      const examSlug = exam.slug || createSlug(exam.name);
      const examSubjects = subjectsByExam.get(exam._id.toString()) || [];
      for (const subject of examSubjects) {
        const subjectSlug = subject.slug || createSlug(subject.name);
        addContentPathsWithTabs(
          routes,
          [examSlug, subjectSlug],
          0.82
        );
        const subjectUnits = unitsBySubject.get(subject._id.toString()) || [];
        for (const unit of subjectUnits) {
          const unitSlug = unit.slug || createSlug(unit.name);
          addContentPathsWithTabs(
            routes,
            [examSlug, subjectSlug, unitSlug],
            0.8
          );
          const unitChapters = chaptersByUnit.get(unit._id.toString()) || [];
          for (const chapter of unitChapters) {
            const chapterSlug = chapter.slug || createSlug(chapter.name);
            addContentPathsWithTabs(
              routes,
              [examSlug, subjectSlug, unitSlug, chapterSlug],
              0.78
            );
            const chapterTopics = topicsByChapter.get(chapter._id.toString()) || [];
            for (const topic of chapterTopics) {
              const topicSlug = topic.slug || createSlug(topic.name);
              addContentPathsWithTabs(
                routes,
                [examSlug, subjectSlug, unitSlug, chapterSlug, topicSlug],
                0.76
              );
              const topicSubTopics =
                subTopicsByTopic.get(topic._id.toString()) || [];
              for (const subTopic of topicSubTopics) {
                const subTopicSlug = subTopic.slug || createSlug(subTopic.name);
                addContentPathsWithTabs(
                  routes,
                  [
                    examSlug,
                    subjectSlug,
                    unitSlug,
                    chapterSlug,
                    topicSlug,
                    subTopicSlug,
                  ],
                  0.74
                );
                const subDefs =
                  definitionsBySubTopic.get(subTopic._id.toString()) || [];
                for (const def of subDefs) {
                  const defSlug = def.slug || createSlug(def.name);
                  addContentPathsWithTabs(
                    routes,
                    [
                      examSlug,
                      subjectSlug,
                      unitSlug,
                      chapterSlug,
                      topicSlug,
                      subTopicSlug,
                      defSlug,
                    ],
                    0.72
                  );
                }
              }
            }
          }
        }
      }
    }

    // --- Discussion thread detail URLs (?tab=discussion&thread=slug) ---
    const threads = await Thread.find({ isApproved: true })
      .select("slug examId subjectId unitId chapterId topicId subTopicId definitionId")
      .populate("examId", "slug")
      .populate("subjectId", "slug")
      .populate("unitId", "slug")
      .populate("chapterId", "slug")
      .populate("topicId", "slug")
      .populate("subTopicId", "slug")
      .populate("definitionId", "slug")
      .limit(5000)
      .lean();

    for (const thread of threads) {
      if (!thread?.slug) continue;
      const segs = [];
      if (thread.examId?.slug) segs.push(thread.examId.slug);
      if (thread.subjectId?.slug) segs.push(thread.subjectId.slug);
      if (thread.unitId?.slug) segs.push(thread.unitId.slug);
      if (thread.chapterId?.slug) segs.push(thread.chapterId.slug);
      if (thread.topicId?.slug) segs.push(thread.topicId.slug);
      if (thread.subTopicId?.slug) segs.push(thread.subTopicId.slug);
      if (thread.definitionId?.slug) segs.push(thread.definitionId.slug);
      if (segs.length === 0) continue;
      const path = "/" + segs.join("/");
      routes.push(
        entry(path, {
          query: { tab: "discussion", thread: thread.slug },
          priority: 0.7,
          changeFrequency: "weekly",
        })
      );
    }

    // --- Practice test detail URLs (?tab=practice&test=id) ---
    const practiceTests = await PracticeSubCategory.find({
      status: statusActive,
    })
      .select("_id categoryId unitId chapterId topicId subTopicId")
      .populate({
        path: "categoryId",
        select: "examId subjectId",
        populate: [
          { path: "examId", select: "slug" },
          { path: "subjectId", select: "slug" },
        ],
      })
      .populate("unitId", "slug")
      .populate("chapterId", "slug")
      .populate("topicId", "slug")
      .populate("subTopicId", "slug")
      .limit(5000)
      .lean();

    for (const test of practiceTests) {
      const cat = test.categoryId;
      if (!cat?.examId) continue;
      const examSlug =
        (typeof cat.examId === "object" && cat.examId?.slug) ||
        examSlugMap.get(cat.examId?.toString?.() || String(cat.examId)) ||
        "";
      if (!examSlug) continue;
      const segs = [examSlug];
      if (cat.subjectId) {
        const subSlug =
          (typeof cat.subjectId === "object" && cat.subjectId?.slug) ||
          subjectSlugMap.get(
            cat.subjectId?.toString?.() || String(cat.subjectId)
          )?.slug;
        if (subSlug) segs.push(subSlug);
      }
      if (test.unitId?.slug) segs.push(test.unitId.slug);
      if (test.chapterId?.slug) segs.push(test.chapterId.slug);
      if (test.topicId?.slug) segs.push(test.topicId.slug);
      if (test.subTopicId?.slug) segs.push(test.subTopicId.slug);
      const path = "/" + segs.join("/");
      const testId = test._id.toString();
      routes.push(
        entry(path, {
          query: { tab: "practice", test: testId },
          priority: 0.68,
          changeFrequency: "weekly",
        })
      );
    }

    // --- Courses (exam-scoped) ---
    const courses = await Course.find({ status: statusActive })
      .select("slug examId")
      .populate("examId", "slug name")
      .lean();

    for (const course of courses) {
      const examId = course.examId?._id?.toString() || course.examId?.toString();
      const examSlug =
        course.examId?.slug ||
        examSlugMap.get(examId) ||
        (course.examId?.name && createSlug(course.examId.name));
      if (examSlug && course.slug) {
        routes.push(
          entry(`/${examSlug}/course/${course.slug}`, {
            changeFrequency: "weekly",
            priority: 0.8,
          })
        );
      }
    }

    // --- Pages: site-level and exam-level ---
    const pages = await Page.find({
      status: statusActive,
      deletedAt: null,
    })
      .select("slug exam updatedAt")
      .populate("exam", "slug name")
      .lean();

    for (const page of pages) {
      if (!page.slug) continue;
      const lastMod = page.updatedAt ? new Date(page.updatedAt) : new Date();
      if (page.exam && (page.exam.slug || page.exam.name)) {
        const examSlug = page.exam.slug || createSlug(page.exam.name);
        routes.push(
          entry(`/${examSlug}/pages/${page.slug}`, {
            lastModified: lastMod,
            changeFrequency: "monthly",
            priority: 0.7,
          })
        );
      } else {
        routes.push(
          entry(`/pages/${page.slug}`, {
            lastModified: lastMod,
            changeFrequency: "monthly",
            priority: 0.7,
          })
        );
      }
    }

    // --- Blog: exam blog list, category, post ---
    const blogs = await Blog.find({
      examId: { $in: exams.map((e) => e._id) },
      status: "active",
    })
      .select("slug examId")
      .populate("examId", "slug")
      .limit(2000)
      .lean();

    for (const blog of blogs) {
      const examSlug =
        blog.examId?.slug ||
        examSlugMap.get(blog.examId?._id?.toString());
      if (examSlug && blog.slug) {
        routes.push(
          entry(`/${examSlug}/blog/${blog.slug}`, {
            changeFrequency: "weekly",
            priority: 0.72,
          })
        );
      }
    }

    const blogCategories = await BlogCategory.find({
      examId: { $in: exams.map((e) => e._id) },
      status: "active",
    })
      .select("slug examId")
      .populate("examId", "slug")
      .lean();

    for (const cat of blogCategories) {
      const examSlug =
        cat.examId?.slug || examSlugMap.get(cat.examId?._id?.toString());
      if (examSlug && cat.slug) {
        routes.push(
          entry(`/${examSlug}/blog/category/${cat.slug}`, {
            changeFrequency: "weekly",
            priority: 0.7,
          })
        );
      }
    }

    // --- Download: top-level folders per exam ---
    const rootFolders = await DownloadFolder.find({
      parentFolderId: null,
      examId: { $in: exams.map((e) => e._id) },
      status: "active",
    })
      .select("slug examId")
      .populate("examId", "slug")
      .lean();

    for (const folder of rootFolders) {
      const examSlug =
        folder.examId?.slug ||
        examSlugMap.get(folder.examId?._id?.toString());
      if (examSlug && folder.slug) {
        routes.push(
          entry(`/${examSlug}/download/${folder.slug}`, {
            changeFrequency: "weekly",
            priority: 0.68,
          })
        );
      }
    }

    // --- Notifications (detail pages) ---
    const notifications = await Notification.find({})
      .select("slug updatedAt")
      .limit(500)
      .lean();

    for (const n of notifications) {
      if (n.slug) {
        routes.push(
          entry(`/notification/${n.slug}`, {
            lastModified: n.updatedAt ? new Date(n.updatedAt) : new Date(),
            changeFrequency: "monthly",
            priority: 0.5,
          })
        );
      }
    }
  } catch (err) {
    console.error("[sitemap] Error fetching dynamic routes:", err);
  }

  return routes.filter(Boolean);
}
