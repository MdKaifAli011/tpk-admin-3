#!/usr/bin/env node
// Normalize orderNumber fields across models so sequences start at 1 and are contiguous per scope.

import { connectDB, disconnectDB } from "../lib/mongodb.js";
import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

// Import models directly
import Exam from "../models/Exam.js";
import Subject from "../models/Subject.js";
import Unit from "../models/Unit.js";
import Chapter from "../models/Chapter.js";
import Topic from "../models/Topic.js";
import SubTopic from "../models/SubTopic.js";
import Definition from "../models/Definition.js";
import PracticeCategory from "../models/PracticeCategory.js";
import PracticeSubCategory from "../models/PracticeSubCategory.js";
import PracticeQuestion from "../models/PracticeQuestion.js";
import DownloadFolder from "../models/DownloadFolder.js";
import DownloadFile from "../models/DownloadFile.js";
import BlogCategory from "../models/BlogCategory.js";

const JOBS = [
  // model, scope field (null = global), human name
  { model: Exam, scope: null, name: "Exam (global)" },
  { model: Subject, scope: "examId", name: "Subject (per exam)" },
  { model: Unit, scope: "subjectId", name: "Unit (per subject)" },
  { model: Chapter, scope: "unitId", name: "Chapter (per unit)" },
  { model: Topic, scope: "chapterId", name: "Topic (per chapter)" },
  { model: SubTopic, scope: "topicId", name: "SubTopic (per topic)" },
  { model: Definition, scope: "subTopicId", name: "Definition (per subTopic)" },
  { model: PracticeCategory, scope: "examId", name: "PracticeCategory (per exam)" },
  { model: PracticeSubCategory, scope: "categoryId", name: "PracticeSubCategory (per category)" },
  { model: PracticeQuestion, scope: "subCategoryId", name: "PracticeQuestion (per subCategory)" },
  { model: DownloadFolder, scope: "parentFolderId", name: "DownloadFolder (per parentFolder)" },
  { model: DownloadFile, scope: "folderId", name: "DownloadFile (per folder)" },
  { model: BlogCategory, scope: "examId", name: "BlogCategory (per exam)" },
];

async function normalizeModel(model, scopeField) {
  const collection = model.collection.collectionName;
  logger.info(`\n--- Normalizing ${collection} (scope=${scopeField || 'global'}) ---`);

  // Build list of distinct scope keys
  const groupPipeline = [];
  if (scopeField) {
    groupPipeline.push({ $group: { _id: `$${scopeField}` } });
  } else {
    groupPipeline.push({ $group: { _id: null } });
  }

  const scopes = await model.aggregate(groupPipeline).allowDiskUse(true);

  for (const s of scopes) {
    const scopeKey = s._id === null ? null : s._id;
    const query = scopeField ? { [scopeField]: scopeKey } : {};

    // Fetch all docs in this scope ordered by current orderNumber (nulls last) then createdAt
    const docs = await model.find(query).sort({ orderNumber: 1, createdAt: 1 }).select("_id orderNumber").lean();

    // Reassign orderNumbers sequentially starting from 1
    const bulkOps = [];
    let expected = 1;
    for (const doc of docs) {
      const current = doc.orderNumber || 0;
      if (current !== expected) {
        bulkOps.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: { orderNumber: expected } },
          },
        });
      }
      expected++;
    }

    if (bulkOps.length > 0) {
      const res = await model.bulkWrite(bulkOps, { ordered: false });
      logger.info(`Scope ${scopeKey || 'global'}: updated ${res.modifiedCount || res.nModified || 0} docs`);
    } else {
      logger.info(`Scope ${scopeKey || 'global'}: already contiguous`);
    }
  }
}

async function main() {
  try {
    await connectDB();
    for (const job of JOBS) {
      await normalizeModel(job.model, job.scope);
    }
    logger.info('\nAll done.');
  } catch (err) {
    logger.error('Error during normalization:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  main();
}

export default main;
