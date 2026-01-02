/**
 * Import NEET Physics data from JSON file
 * 
 * Usage: node scripts/import-neet-physics-data-json.js
 */

import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Load models dynamically to avoid circular dependency issues
const Exam = mongoose.models.Exam || (await import("../models/Exam.js")).default;
const Subject = mongoose.models.Subject || (await import("../models/Subject.js")).default;
const Unit = mongoose.models.Unit || (await import("../models/Unit.js")).default;
const Chapter = mongoose.models.Chapter || (await import("../models/Chapter.js")).default;
const Topic = mongoose.models.Topic || (await import("../models/Topic.js")).default;
const SubTopic = mongoose.models.SubTopic || (await import("../models/SubTopic.js")).default;
const Definition = mongoose.models.Definition || (await import("../models/Definition.js")).default;
const ChapterDetails = mongoose.models.ChapterDetails || (await import("../models/ChapterDetails.js")).default;
const TopicDetails = mongoose.models.TopicDetails || (await import("../models/TopicDetails.js")).default;
const SubTopicDetails = mongoose.models.SubTopicDetails || (await import("../models/SubTopicDetails.js")).default;
const DefinitionDetails = mongoose.models.DefinitionDetails || (await import("../models/DefinitionDetails.js")).default;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const EXAM_NAME = "NEET";
const SUBJECT_NAME = "Physics";
const JSON_FILE_PATH = path.join(__dirname, "..", "seed-neet-physicss.json");

// Database configuration
const MONGODB_URI = process.env.MONGODB_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME;

if (!MONGODB_URI) {
    console.error("❌ Error: MONGODB_URI environment variable is required");
    process.exit(1);
}

/**
 * Connect to MongoDB
 */
async function connectDB() {
    try {
        if (mongoose.connection.readyState === 0) {
            console.log("🔄 Connecting to MongoDB...");
            await mongoose.connect(MONGODB_URI, {
                dbName: MONGO_DB_NAME,
            });
            console.log("✅ Connected to MongoDB successfully");
        }
    } catch (error) {
        console.error("❌ Error connecting to MongoDB:", error);
        throw error;
    }
}

/**
 * Get or create exam
 */
async function getOrCreateExam(examName) {
    let exam = await Exam.findOne({ name: examName });
    if (!exam) {
        // Find next order number
        const lastExam = await Exam.findOne().sort({ orderNumber: -1 });
        const nextOrderNumber = (lastExam && lastExam.orderNumber) ? lastExam.orderNumber + 1 : 1;

        exam = new Exam({
            name: examName,
            status: "active",
            orderNumber: nextOrderNumber,
        });
        await exam.save();
        console.log(`✅ Created exam: ${examName} (Order: ${nextOrderNumber})`);
    }
    return exam;
}

/**
 * Get or create subject
 */
async function getOrCreateSubject(subjectName, examId) {
    let subject = await Subject.findOne({
        name: subjectName,
        examId: examId,
    });
    if (!subject) {
        // Find the next order number for this exam
        const lastSubject = await Subject.findOne({ examId: examId }).sort({ orderNumber: -1 });
        const nextOrderNumber = (lastSubject && lastSubject.orderNumber) ? lastSubject.orderNumber + 1 : 1;

        subject = new Subject({
            name: subjectName,
            examId: examId,
            status: "active",
            orderNumber: nextOrderNumber,
        });
        await subject.save();
        console.log(`✅ Created subject: ${subjectName} (Order: ${nextOrderNumber})`);
    }
    return subject;
}

/**
 * Main import function
 */
async function importData() {
    try {
        console.log("🚀 Starting NEET Physics data import from JSON...\n");

        // Connect to database
        await connectDB();

        // Read JSON file
        console.log(`📖 Reading JSON file: ${JSON_FILE_PATH}`);
        const rawData = fs.readFileSync(JSON_FILE_PATH, "utf-8");
        const seedData = JSON.parse(rawData);

        // Get or create exam and subject first to link properly
        // Note: The JSON uses hardcoded OIDs. We will map them to actual DB OIDs.
        const exam = await getOrCreateExam(EXAM_NAME);
        const subject = await getOrCreateSubject(SUBJECT_NAME, exam._id);

        // Maps to store mapping from JSON OID (string) to Actual DB OID
        const oidMap = new Map();

        // Hardcoded exam/subject from DB overrides the ones in JSON
        // The JSON seems to assume specific OIDs for exam/subject/unit that might not exist.
        // We will use the JSON data but replace the references with our actual DB references.

        // We need to map the "mock" OIDs in the JSON to the real ones we create/find.
        // Specifically identifying the exam/subject/unit/chapter IDs from the JSON structure
        // Since the JSON is flat arrays, we iterate through types.

        // 1. Chapters
        const chaptersData = seedData["tpk-admin-db-1.chapters"] || [];
        console.log(`\n📦 Importing ${chaptersData.length} Chapters...`);

        // Need to identify unique Units from chapters since Units are not in the JSON root
        // The JSON uses a unitId "64a0000000000000000000c1" for all chapters in snippet.
        // We should map this specific ID to our fallback unit.

        const fallbackUnitName = "General Physics Unit";
        let fallbackUnit = await Unit.findOne({ name: fallbackUnitName, subjectId: subject._id });
        if (!fallbackUnit) {
            const lastUnit = await Unit.findOne({ subjectId: subject._id }).sort({ orderNumber: -1 });
            const nextUnitOrder = (lastUnit && lastUnit.orderNumber) ? lastUnit.orderNumber + 1 : 1;

            fallbackUnit = new Unit({
                name: fallbackUnitName,
                subjectId: subject._id,
                examId: exam._id,
                status: "active",
                orderNumber: nextUnitOrder
            });
            await fallbackUnit.save();
            console.log(`  Created fallback Unit: ${fallbackUnitName}`);
        }

        // Populate oidMap with known missing Units from JSON if consistent
        // Assuming the OID used in JSON for unit is '64a0000000000000000000c1' based on inspection
        oidMap.set('64a0000000000000000000c1', fallbackUnit._id);


        for (const item of chaptersData) {
            // Check if we already have this chapter (by name)
            const existingChapter = await Chapter.findOne({ name: item.name, subjectId: subject._id });
            let chapterId;
            if (existingChapter) {
                chapterId = existingChapter._id;
                console.log(`  ℹ️  Found Chapter: ${item.name}`);
            } else {
                // Get real unit ID.
                // If item.unitId is present, try to map it.
                let realUnitId = fallbackUnit._id;
                if (item.unitId && item.unitId.$oid && oidMap.has(item.unitId.$oid)) {
                    realUnitId = oidMap.get(item.unitId.$oid);
                }

                // Handle orderNumber collision for Chapter
                // Actually, we can just use the provided orderNumber but if it collides?
                // Chapters are unique per Unit. Since we created a new Unit/Subject potentially, collision is unlikely unless we run twice.
                // But better safe:
                // If chapter exists, we used it. If not, we create.

                const newChapter = new Chapter({
                    name: item.name,
                    slug: item.slug, // Mongoose pre-save writes slug if missing, but we can respect JSON
                    orderNumber: item.orderNumber,
                    examId: exam._id,
                    subjectId: subject._id,
                    unitId: realUnitId,
                    status: item.status || "active",
                });

                // If slug collision or other error, catch?
                // But duplicate key on slug is possible if we run twice.
                // But we checked `existingChapter` above.

                try {
                    await newChapter.save();
                    chapterId = newChapter._id;
                    console.log(`  ✅ Created Chapter: ${item.name}`);
                } catch (e) {
                    if (e.code === 11000) {
                        console.warn(`  ⚠️  Duplicate Chapter skipped/found: ${item.name}`);
                        // Try to find it again just in case
                        const ch = await Chapter.findOne({ name: item.name, subjectId: subject._id });
                        if (ch) chapterId = ch._id;
                    } else {
                        throw e;
                    }
                }
            }
            if (chapterId) oidMap.set(item._id.$oid, chapterId);
        }

        // 2. Chapter Details
        const chapterDetailsData = seedData["tpk-admin-db-1.chapterdetails"] || [];
        console.log(`\n📝 Importing ${chapterDetailsData.length} Chapter Details...`);

        for (const item of chapterDetailsData) {
            const realChapterId = oidMap.get(item.chapterId.$oid);
            if (!realChapterId) {
                // Warning is noisy if creating partials
                continue;
            }

            await ChapterDetails.findOneAndUpdate(
                { chapterId: realChapterId },
                {
                    chapterId: realChapterId,
                    content: item.content,
                    title: item.title,
                    metaDescription: item.metaDescription,
                    keywords: item.keywords,
                    status: item.status
                },
                { upsert: true, new: true }
            );
        }

        // 3. Topics
        const topicsData = seedData["tpk-admin-db-1.topics"] || [];
        console.log(`\n📚 Importing ${topicsData.length} Topics...`);

        for (const item of topicsData) {
            const realChapterId = oidMap.get(item.chapterId.$oid);
            const realUnitId = oidMap.get(item.unitId.$oid) || fallbackUnit._id;

            if (!realChapterId) continue;

            const existingTopic = await Topic.findOne({ name: item.name, chapterId: realChapterId });
            let topicId;

            if (existingTopic) {
                topicId = existingTopic._id;
                console.log(`  ℹ️  Found Topic: ${item.name}`);
            } else {
                const newTopic = new Topic({
                    name: item.name,
                    slug: item.slug,
                    orderNumber: item.orderNumber,
                    examId: exam._id,
                    subjectId: subject._id,
                    unitId: realUnitId,
                    chapterId: realChapterId,
                    status: item.status || "active"
                });
                try {
                    await newTopic.save();
                    topicId = newTopic._id;
                    console.log(`  ✅ Created Topic: ${item.name}`);
                } catch (e) {
                    if (e.code === 11000) {
                        const t = await Topic.findOne({ name: item.name, chapterId: realChapterId });
                        if (t) topicId = t._id;
                    } else throw e;
                }
            }
            if (topicId) oidMap.set(item._id.$oid, topicId);
        }

        // 4. Topic Details
        const topicDetailsData = seedData["tpk-admin-db-1.topicdetails"] || [];
        console.log(`\n📝 Importing ${topicDetailsData.length} Topic Details...`);

        for (const item of topicDetailsData) {
            const realTopicId = oidMap.get(item.topicId.$oid);
            if (!realTopicId) continue;

            await TopicDetails.findOneAndUpdate(
                { topicId: realTopicId },
                {
                    topicId: realTopicId,
                    content: item.content,
                    title: item.title,
                    metaDescription: item.metaDescription,
                    keywords: item.keywords,
                },
                { upsert: true }
            );
        }

        // 5. SubTopics
        const subTopicsData = seedData["tpk-admin-db-1.subtopics"] || [];
        console.log(`\n📑 Importing ${subTopicsData.length} SubTopics...`);

        for (const item of subTopicsData) {
            const realTopicId = oidMap.get(item.topicId.$oid);
            const realChapterId = oidMap.get(item.chapterId.$oid);
            const realUnitId = oidMap.get(item.unitId.$oid) || fallbackUnit._id;

            if (!realTopicId) continue;

            const existingSubTopic = await SubTopic.findOne({ name: item.name, topicId: realTopicId });
            let subTopicId;

            if (existingSubTopic) {
                subTopicId = existingSubTopic._id;
                console.log(`  ℹ️  Found SubTopic: ${item.name}`);
            } else {
                const newSubTopic = new SubTopic({
                    name: item.name,
                    slug: item.slug,
                    orderNumber: item.orderNumber,
                    examId: exam._id,
                    subjectId: subject._id,
                    unitId: realUnitId,
                    chapterId: realChapterId,
                    topicId: realTopicId,
                    status: item.status || "active"
                });
                try {
                    await newSubTopic.save();
                    subTopicId = newSubTopic._id;
                    console.log(`  ✅ Created SubTopic: ${item.name}`);
                } catch (e) {
                    if (e.code === 11000) {
                        const st = await SubTopic.findOne({ name: item.name, topicId: realTopicId });
                        if (st) subTopicId = st._id;
                    } else throw e;
                }
            }
            if (subTopicId) oidMap.set(item._id.$oid, subTopicId);
        }

        // 6. SubTopic Details
        const subTopicDetailsData = seedData["tpk-admin-db-1.subtopicdetails"] || [];
        if (subTopicDetailsData.length > 0) {
            console.log(`\n📝 Importing ${subTopicDetailsData.length} SubTopic Details...`);
            for (const item of subTopicDetailsData) {
                const realSubTopicId = oidMap.get(item.subTopicId.$oid);
                if (!realSubTopicId) continue;

                await SubTopicDetails.findOneAndUpdate(
                    { subTopicId: realSubTopicId },
                    {
                        subTopicId: realSubTopicId,
                        content: item.content,
                        title: item.title,
                    },
                    { upsert: true }
                );
            }
        }


        // 7. Definitions
        const definitionsData = seedData["tpk-admin-db-1.definitions"] || [];
        console.log(`\n📖 Importing ${definitionsData.length} Definitions...`);

        for (const item of definitionsData) {
            const realSubTopicId = oidMap.get(item.subTopicId.$oid);
            const realTopicId = oidMap.get(item.topicId.$oid);
            const realChapterId = oidMap.get(item.chapterId.$oid);
            const realUnitId = oidMap.get(item.unitId.$oid) || fallbackUnit._id;

            if (!realSubTopicId) continue;

            const existingDef = await Definition.findOne({ name: item.name, subTopicId: realSubTopicId });
            let defId;

            if (existingDef) {
                defId = existingDef._id;
                console.log(`  ℹ️  Found Definition: ${item.name}`);
            } else {
                const newDef = new Definition({
                    name: item.name,
                    slug: item.slug,
                    orderNumber: item.orderNumber,
                    examId: exam._id,
                    subjectId: subject._id,
                    unitId: realUnitId,
                    chapterId: realChapterId,
                    topicId: realTopicId,
                    subTopicId: realSubTopicId,
                    status: item.status || "active"
                });
                try {
                    await newDef.save();
                    defId = newDef._id;
                    console.log(`  ✅ Created Definition: ${item.name}`);
                } catch (e) {
                    if (e.code === 11000) {
                        const d = await Definition.findOne({ name: item.name, subTopicId: realSubTopicId });
                        if (d) defId = d._id;
                    } else throw e;
                }
            }
            if (defId) oidMap.set(item._id.$oid, defId);
        }

        console.log("\n" + "=".repeat(60));
        console.log("✅ Import completed successfully!");
        console.log("=".repeat(60));

    } catch (error) {
        console.error("\n❌ Error during import:", error);
        process.exit(1);
    } finally {
        // Close database connection
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log("🔌 Database connection closed");
        }
        process.exit(0);
    }
}

// Run the import
importData().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
});
