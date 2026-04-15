/**
 * Import HTML from ContentDb into MongoDB *details* collections (content field only).
 *
 * Prerequisites:
 * - Exam, Subject, Unit, Chapter, Topic / SubTopic / Definition rows already exist with slugs
 *   that match ContentDb folder names.
 *
 * Mapping:
 * - ContentDb/{chapter-folder}/{chapter-folder}.html  → ChapterDetails.content
 * - Chapter lookup: folder names are like `chapter-01-units-dimensions-and-measurement` but MongoDB
 *   chapters often use slug `units-dimensions-and-measurement` only. The script tries (1) full folder
 *   name, then (2) slug with `chapter-NN-` stripped.
 * - ContentDb/{chapter-folder}/{leaf-slug}/{leaf-slug}.html → first match among Topic, SubTopic,
 *   Definition (under that chapter) by slug, in configurable order.
 *
 * Usage:
 *   node scripts/import-contentdb-html.mjs
 *   DRY_RUN=1 node scripts/import-contentdb-html.mjs
 *   CONTENT_DB_PATH=./ContentDb EXAM_SLUG=neet SUBJECT_SLUG=physics node scripts/import-contentdb-html.mjs
 *
 * Env:
 *   MONGODB_URI, MONGO_DB_NAME (optional) — required
 *   CONTENT_DB_PATH — default: ./ContentDb (relative to repo root)
 *   EXAM_SLUG / EXAM_NAME — default: neet / NEET
 *   SUBJECT_SLUG / SUBJECT_NAME — default: physics / Physics
 *   MATCH_ORDER — comma list: topic,subtopic,definition (default)
 *   CONTENT_IMPORT_STATUS — publish | unpublish | draft (default: draft)
 *   DRY_RUN — 1/true: log actions only, no DB writes
 */

import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

import Exam from "../models/Exam.js";
import Subject from "../models/Subject.js";
import Chapter from "../models/Chapter.js";
import Topic from "../models/Topic.js";
import SubTopic from "../models/SubTopic.js";
import Definition from "../models/Definition.js";
import ChapterDetails from "../models/ChapterDetails.js";
import TopicDetails from "../models/TopicDetails.js";
import SubTopicDetails from "../models/SubTopicDetails.js";
import DefinitionDetails from "../models/DefinitionDetails.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const MONGODB_URI = process.env.MONGODB_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME;

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function truthyDryRun() {
  const v = process.env.DRY_RUN;
  if (!v) return false;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

function parseMatchOrder() {
  const raw = process.env.MATCH_ORDER || "topic,subtopic,definition";
  const allowed = new Set(["topic", "subtopic", "definition"]);
  const parts = raw
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p) => allowed.has(p));
  if (parts.length === 0) return ["topic", "subtopic", "definition"];
  return parts;
}

/**
 * ContentDb folders look like `chapter-01-units-dimensions-and-measurement`.
 * Stored Chapter.slug is often only `units-dimensions-and-measurement` (no `chapter-NN-` prefix).
 * Returns unique candidates in order: full folder name first, then stripped form.
 */
function chapterSlugCandidatesFromContentFolder(folderName) {
  const out = [];
  if (folderName) out.push(folderName);
  const m = folderName.match(/^chapter-\d+-(.+)$/i);
  if (m?.[1]) out.push(m[1]);
  return [...new Set(out)];
}

async function findChapterForContentFolder(examId, subjectId, folderName) {
  const candidates = chapterSlugCandidatesFromContentFolder(folderName);
  for (const slug of candidates) {
    const ch = await Chapter.findOne({
      examId,
      subjectId,
      slug,
    }).lean();
    if (ch) return { chapter: ch, matchedSlug: slug, candidates };
  }
  return { chapter: null, matchedSlug: null, candidates };
}

async function resolveExam() {
  const slug = process.env.EXAM_SLUG?.trim();
  const name = process.env.EXAM_NAME?.trim();

  if (slug) {
    const e = await Exam.findOne({
      slug: new RegExp(`^${escapeRegex(slug)}$`, "i"),
    });
    if (e) return e;
  }
  if (name) {
    const e = await Exam.findOne({
      name: new RegExp(`^${escapeRegex(name)}$`, "i"),
    });
    if (e) return e;
  }
  let e = await Exam.findOne({ slug: /^neet$/i });
  if (e) return e;
  e = await Exam.findOne({ name: /^neet$/i });
  return e;
}

async function resolveSubject(examId) {
  const slug = process.env.SUBJECT_SLUG?.trim();
  const name = process.env.SUBJECT_NAME?.trim();

  if (slug) {
    const s = await Subject.findOne({
      examId,
      slug: new RegExp(`^${escapeRegex(slug)}$`, "i"),
    });
    if (s) return s;
  }
  if (name) {
    const s = await Subject.findOne({
      examId,
      name: new RegExp(`^${escapeRegex(name)}$`, "i"),
    });
    if (s) return s;
  }
  let s = await Subject.findOne({
    examId,
    slug: /^physics-test$/i,
  });
  if (s) return s;
  s = await Subject.findOne({
    examId,
    name: /^physics-test$/i,
  });
  return s;
}

/**
 * @param {import("mongoose").Types.ObjectId} chapterId
 * @param {string} leafSlug
 * @param {string[]} order
 */
async function findLeafNode(chapterId, leafSlug, order) {
  for (const level of order) {
    if (level === "topic") {
      const doc = await Topic.findOne({ chapterId, slug: leafSlug }).lean();
      if (doc) return { level: "topic", doc };
    } else if (level === "subtopic") {
      const doc = await SubTopic.findOne({ chapterId, slug: leafSlug }).lean();
      if (doc) return { level: "subtopic", doc };
    } else if (level === "definition") {
      const doc = await Definition.findOne({
        chapterId,
        slug: leafSlug,
      }).lean();
      if (doc) return { level: "definition", doc };
    }
  }
  return null;
}

async function upsertDetails(level, id, html, status, dryRun) {
  const set = { content: html, status };
  if (dryRun) return;

  if (level === "chapter") {
    await ChapterDetails.findOneAndUpdate(
      { chapterId: id },
      { $set: set },
      { upsert: true, new: true },
    );
  } else if (level === "topic") {
    await TopicDetails.findOneAndUpdate(
      { topicId: id },
      { $set: set },
      { upsert: true, new: true },
    );
  } else if (level === "subtopic") {
    await SubTopicDetails.findOneAndUpdate(
      { subTopicId: id },
      { $set: set },
      { upsert: true, new: true },
    );
  } else if (level === "definition") {
    await DefinitionDetails.findOneAndUpdate(
      { definitionId: id },
      { $set: set },
      { upsert: true, new: true },
    );
  }
}

async function connectDB() {
  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is required in .env");
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI, {
    dbName: MONGO_DB_NAME || undefined,
  });
  console.log("✅ Connected to MongoDB");
}

async function main() {
  const dryRun = truthyDryRun();
  const contentRoot = path.resolve(
    REPO_ROOT,
    process.env.CONTENT_DB_PATH || "ContentDb",
  );
  const matchOrder = parseMatchOrder();
  const status =
    process.env.CONTENT_IMPORT_STATUS &&
    ["publish", "unpublish", "draft"].includes(
      process.env.CONTENT_IMPORT_STATUS,
    )
      ? process.env.CONTENT_IMPORT_STATUS
      : "draft";

  console.log("Content root:", contentRoot);
  console.log("Dry run:", dryRun);
  console.log("Match order:", matchOrder.join(" → "));
  console.log("Content status:", status);

  await connectDB();

  const exam = await resolveExam();
  if (!exam) {
    console.error(
      "❌ Exam not found. Set EXAM_SLUG / EXAM_NAME or create NEET.",
    );
    process.exit(1);
  }
  console.log(`Exam: ${exam.name} (${exam.slug || "no slug"})`);

  const subject = await resolveSubject(exam._id);
  if (!subject) {
    console.error(
      "❌ Subject not found for this exam. Set SUBJECT_SLUG / SUBJECT_NAME or create Physics.",
    );
    process.exit(1);
  }
  console.log(`Subject: ${subject.name} (${subject.slug || "no slug"})`);

  let entries;
  try {
    entries = await fs.readdir(contentRoot, { withFileTypes: true });
  } catch (e) {
    console.error("❌ Cannot read CONTENT_DB_PATH:", contentRoot, e.message);
    process.exit(1);
  }

  const chapterDirs = entries.filter(
    (d) => d.isDirectory() && d.name.startsWith("chapter-"),
  );

  const stats = {
    chapterHtml: { ok: 0, skip: 0, missing: 0 },
    leafHtml: { ok: 0, skip: 0, notFound: 0 },
  };
  const notFound = [];

  for (const dir of chapterDirs) {
    const chapterFolderName = dir.name;
    const chapterDir = path.join(contentRoot, chapterFolderName);

    const { chapter, matchedSlug, candidates } =
      await findChapterForContentFolder(
        exam._id,
        subject._id,
        chapterFolderName,
      );

    if (!chapter) {
      console.warn(
        `⚠️  No Chapter for folder "${chapterFolderName}". Tried slug(s): ${candidates.join(" | ")}`,
      );
      continue;
    }

    if (matchedSlug !== chapterFolderName) {
      console.log(
        `  → Chapter matched with DB slug "${matchedSlug}" (folder: ${chapterFolderName})`,
      );
    }

    /** @type {import("mongoose").Types.ObjectId} */
    const chapterId = chapter._id;

    // Chapter-level HTML: {chapter-slug}/{chapter-slug}.html
    const chapterHtmlPath = path.join(chapterDir, `${chapterFolderName}.html`);
    try {
      const raw = await fs.readFile(chapterHtmlPath, "utf8");
      if (raw.trim().length === 0) {
        stats.chapterHtml.skip++;
        console.log(`  (empty) ${chapterFolderName}.html — skip`);
      } else {
        if (!dryRun) {
          await upsertDetails("chapter", chapterId, raw, status, false);
        }
        stats.chapterHtml.ok++;
        console.log(`✓ ChapterDetails ← ${chapterFolderName}.html`);
      }
    } catch {
      stats.chapterHtml.missing++;
      console.log(`  (no file) ${chapterFolderName}.html`);
    }

    // Leaf folders: one level under chapter
    const subEntries = await fs.readdir(chapterDir, { withFileTypes: true });
    for (const sub of subEntries) {
      if (!sub.isDirectory()) continue;
      if (sub.name === chapterFolderName) continue;

      const leafSlug = sub.name;
      const htmlPath = path.join(chapterDir, leafSlug, `${leafSlug}.html`);

      let raw;
      try {
        raw = await fs.readFile(htmlPath, "utf8");
      } catch {
        continue;
      }

      if (!raw.trim()) {
        stats.leafHtml.skip++;
        console.log(`  (empty) ${leafSlug}/${leafSlug}.html — skip`);
        continue;
      }

      const found = await findLeafNode(chapterId, leafSlug, matchOrder);
      if (!found) {
        stats.leafHtml.notFound++;
        notFound.push({ chapter: chapterFolderName, slug: leafSlug });
        console.warn(
          `⚠️  No Topic/SubTopic/Definition with slug "${leafSlug}" under chapter "${chapterFolderName}"`,
        );
        continue;
      }

      const id = found.doc._id;
      if (!dryRun) {
        await upsertDetails(found.level, id, raw, status, false);
      }
      stats.leafHtml.ok++;
      console.log(
        `✓ ${found.level}Details ← ${chapterFolderName}/${leafSlug}/${leafSlug}.html`,
      );
    }
  }

  console.log("\n--- Summary ---");
  console.log("Chapter HTML:", stats.chapterHtml);
  console.log("Leaf HTML:", stats.leafHtml);
  if (notFound.length) {
    console.log(
      `\nNot matched (${notFound.length}): fix slugs in DB or MATCH_ORDER.`,
    );
    notFound
      .slice(0, 30)
      .forEach((n) => console.log(`  - ${n.chapter} / ${n.slug}`));
    if (notFound.length > 30)
      console.log(`  ... and ${notFound.length - 30} more`);
  }

  await mongoose.connection.close();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
