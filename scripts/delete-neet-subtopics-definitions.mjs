#!/usr/bin/env node
/**
 * Delete SubTopics + Definitions for NEET (Biology only).
 *
 * Default mode is DRY RUN (no writes):
 *   node scripts/delete-neet-subtopics-definitions.mjs
 *
 * Execute deletion:
 *   node scripts/delete-neet-subtopics-definitions.mjs --execute --yes
 *
 * Optional:
 *   --exam=NEET   (default: NEET)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import Exam from "../models/Exam.js";
import Subject from "../models/Subject.js";
import SubTopic from "../models/SubTopic.js";
import SubTopicDetails from "../models/SubTopicDetails.js";
import Definition from "../models/Definition.js";
import DefinitionDetails from "../models/DefinitionDetails.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME;

const EXECUTE = process.argv.includes("--execute");
const FORCE_YES = process.argv.includes("--yes");
const examArg = process.argv.find((arg) => arg.startsWith("--exam="));
const EXAM_NAME = (examArg?.split("=")[1] || "NEET").trim();
/** Restrict deletion to Biology only (Chemistry/Physics are intentionally excluded). */
const TARGET_SUBJECTS = ["Biology"];

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is required (set in .env).");
  process.exit(1);
}

if (EXECUTE && !FORCE_YES) {
  console.error(
    "❌ Refusing to execute without --yes. Use: --execute --yes",
  );
  process.exit(1);
}

async function connectDB() {
  await mongoose.connect(MONGODB_URI, {
    ...(MONGO_DB_NAME ? { dbName: MONGO_DB_NAME } : {}),
  });
}

function logPerSubjectCounts(subjects, subTopics, definitions) {
  const subjectNameById = new Map(
    subjects.map((subject) => [String(subject._id), subject.name]),
  );
  const table = subjects.map((subject) => {
    const subjectId = String(subject._id);
    const subTopicCount = subTopics.filter(
      (subTopic) => String(subTopic.subjectId) === subjectId,
    ).length;
    const definitionCount = definitions.filter(
      (definition) => String(definition.subjectId) === subjectId,
    ).length;
    return {
      subject: subjectNameById.get(subjectId),
      subTopics: subTopicCount,
      definitions: definitionCount,
    };
  });

  if (table.length > 0) {
    console.table(table);
  }
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

function ensureLogsDir() {
  const logsDir = path.resolve(__dirname, "..", "scripts", "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
}

function writeDeletionLog({ mode, examName, subjects, subTopics, definitions }) {
  const logsDir = ensureLogsDir();
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(logsDir, `neet-subtopic-definition-delete-${ts}.json`);
  const subjectById = new Map(subjects.map((subject) => [String(subject._id), subject.name]));
  const payload = {
    createdAt: new Date().toISOString(),
    mode,
    exam: examName,
    targetSubjects: TARGET_SUBJECTS,
    subjectCount: subjects.length,
    subTopicCount: subTopics.length,
    definitionCount: definitions.length,
    subjects: subjects.map((subject) => ({
      id: String(subject._id),
      name: subject.name,
    })),
    subTopics: subTopics.map((subTopic) => ({
      id: String(subTopic._id),
      name: subTopic.name,
      slug: subTopic.slug || "",
      subjectId: String(subTopic.subjectId),
      subjectName: subjectById.get(String(subTopic.subjectId)) || "",
    })),
    definitions: definitions.map((definition) => ({
      id: String(definition._id),
      name: definition.name,
      slug: definition.slug || "",
      subjectId: String(definition.subjectId),
      subjectName: subjectById.get(String(definition.subjectId)) || "",
    })),
  };

  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  return filePath;
}

async function run() {
  const mode = EXECUTE ? "EXECUTE" : "DRY RUN";
  console.log(`🚀 NEET subtopic/definition cleanup started (${mode})`);

  await connectDB();
  console.log(
    `✅ Connected to MongoDB${MONGO_DB_NAME ? ` (db: ${MONGO_DB_NAME})` : ""}`,
  );

  const exam = await Exam.findOne({
    name: { $regex: `^${EXAM_NAME}$`, $options: "i" },
  })
    .select("_id name")
    .lean();

  if (!exam) {
    console.log(`ℹ️ Exam "${EXAM_NAME}" not found. Nothing to delete.`);
    return;
  }

  const allExamSubjects = await Subject.find({ examId: exam._id })
    .select("_id name")
    .sort({ orderNumber: 1, name: 1 })
    .lean();

  const targetSet = new Set(TARGET_SUBJECTS.map((name) => normalizeName(name)));
  const subjects = allExamSubjects.filter((subject) =>
    targetSet.has(normalizeName(subject.name)),
  );
  const skippedSubjects = allExamSubjects
    .map((subject) => subject.name)
    .filter((name) => !targetSet.has(normalizeName(name)));

  const subjectIds = subjects.map((subject) => subject._id);
  if (subjectIds.length === 0) {
    console.log(
      `ℹ️ No target subjects found under exam "${exam.name}". Expected: ${TARGET_SUBJECTS.join(", ")}`,
    );
    return;
  }

  const [subTopics, definitions] = await Promise.all([
    SubTopic.find({ examId: exam._id, subjectId: { $in: subjectIds } })
      .select("_id name slug subjectId")
      .lean(),
    Definition.find({ examId: exam._id, subjectId: { $in: subjectIds } })
      .select("_id name slug subjectId")
      .lean(),
  ]);

  const subTopicIds = subTopics.map((subTopic) => subTopic._id);
  const definitionIds = definitions.map((definition) => definition._id);

  console.log(`\nExam: ${exam.name}`);
  console.log(`Target subjects: ${TARGET_SUBJECTS.join(", ")}`);
  console.log(`Subjects matched: ${subjects.map((subject) => subject.name).join(", ")}`);
  if (skippedSubjects.length > 0) {
    console.log(`Subjects skipped: ${skippedSubjects.join(", ")}`);
  }
  console.log(`SubTopics to delete: ${subTopicIds.length}`);
  console.log(`Definitions to delete: ${definitionIds.length}`);
  logPerSubjectCounts(subjects, subTopics, definitions);
  const logPath = writeDeletionLog({
    mode,
    examName: exam.name,
    subjects,
    subTopics,
    definitions,
  });
  console.log(`\n🧾 Detailed list log: ${logPath}`);

  if (!EXECUTE) {
    console.log(
      "\n🔎 DRY RUN complete. No data changed.\nRun with --execute --yes to perform deletion.",
    );
    return;
  }

  const [
    definitionDetailsResult,
    definitionsResult,
    subTopicDetailsResult,
    subTopicsResult,
  ] = await Promise.all([
    definitionIds.length > 0
      ? DefinitionDetails.deleteMany({ definitionId: { $in: definitionIds } })
      : Promise.resolve({ deletedCount: 0 }),
    Definition.deleteMany({ examId: exam._id, subjectId: { $in: subjectIds } }),
    subTopicIds.length > 0
      ? SubTopicDetails.deleteMany({ subTopicId: { $in: subTopicIds } })
      : Promise.resolve({ deletedCount: 0 }),
    SubTopic.deleteMany({ examId: exam._id, subjectId: { $in: subjectIds } }),
  ]);

  console.log("\n🗑️ Deletion completed:");
  console.log(
    `  - DefinitionDetails deleted: ${definitionDetailsResult.deletedCount}`,
  );
  console.log(`  - Definitions deleted: ${definitionsResult.deletedCount}`);
  console.log(
    `  - SubTopicDetails deleted: ${subTopicDetailsResult.deletedCount}`,
  );
  console.log(`  - SubTopics deleted: ${subTopicsResult.deletedCount}`);
  console.log(`  - Detailed item log saved at: ${logPath}`);
}

run()
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("🔌 Database connection closed");
    }
  });
