import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
import DefinitionDetails from "@/models/DefinitionDetails";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import slugify from "slugify";

/**
 * Production-ready Context-Locked Bulk Import API
 * 
 * RULES:
 * - Exam and Subject are LOCKED (selected from UI)
 * - CSV can only create: Unit → Chapter → Topic → SubTopic → Definition
 * - Uses findOrCreate pattern to prevent duplicates
 * - Maintains strict parent-child ID mapping
 * - Skips invalid rows without stopping the import
 */

// Helper: Generate unique slug
const generateSlug = (name, existingSlugs = []) => {
    let baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (existingSlugs.includes(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    return slug;
};

// Helper: Title case conversion
const toTitleCase = (str) => {
    if (!str) return str;
    const exceptions = ['and', 'or', 'of', 'in', 'on', 'at', 'the', 'a', 'an'];
    return str
        .toLowerCase()
        .split(' ')
        .map((word, index) => {
            if (index === 0 || !exceptions.includes(word)) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }
            return word;
        })
        .join(' ');
};

// Helper: Find or Create Unit
const findOrCreateUnit = async (name, subjectId, examId, existingSlugs) => {
    const normalizedName = toTitleCase(name.trim());

    let unit = await Unit.findOne({
        name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        subjectId,
        examId
    });

    if (!unit) {
        const maxOrder = await Unit.findOne({ subjectId, examId })
            .sort({ orderNumber: -1 })
            .select('orderNumber');

        const slug = generateSlug(normalizedName, existingSlugs);
        existingSlugs.push(slug);

        unit = await Unit.create({
            name: normalizedName,
            slug,
            examId,
            subjectId,
            orderNumber: (maxOrder?.orderNumber || 0) + 1,
            status: 'active'
        });
    } else {
        unit = await Unit.findByIdAndUpdate(unit._id, { name: normalizedName }, { new: true });
    }

    return unit;
};

// Helper: Find or Create Chapter
const findOrCreateChapter = async (name, unitId, subjectId, examId, rowData, existingSlugs) => {
    const normalizedName = toTitleCase(name.trim());

    let chapter = await Chapter.findOne({
        name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        unitId,
        subjectId,
        examId
    });

    if (!chapter) {
        const maxOrder = await Chapter.findOne({ unitId, subjectId, examId })
            .sort({ orderNumber: -1 })
            .select('orderNumber');

        const slug = generateSlug(normalizedName, existingSlugs);
        existingSlugs.push(slug);

        chapter = await Chapter.create({
            name: normalizedName,
            slug,
            examId,
            subjectId,
            unitId,
            orderNumber: (maxOrder?.orderNumber || 0) + 1,
            weightage: rowData.weightage ? parseInt(rowData.weightage) : 0,
            time: rowData.time ? parseInt(rowData.time) : 0,
            questions: rowData.questions ? parseInt(rowData.questions) : 0,
            status: 'active'
        });
    } else {
        const updatePayload = { name: normalizedName };
        if (rowData.weightage) updatePayload.weightage = parseInt(rowData.weightage);
        if (rowData.time) updatePayload.time = parseInt(rowData.time);
        if (rowData.questions) updatePayload.questions = parseInt(rowData.questions);

        chapter = await Chapter.findByIdAndUpdate(chapter._id, updatePayload, { new: true });
    }

    return chapter;
};

// Helper: Find or Create Topic
const findOrCreateTopic = async (name, chapterId, unitId, subjectId, examId, existingSlugs) => {
    const normalizedName = toTitleCase(name.trim());

    let topic = await Topic.findOne({
        name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        chapterId,
        unitId,
        subjectId,
        examId
    });

    if (!topic) {
        const maxOrder = await Topic.findOne({ chapterId, unitId, subjectId, examId })
            .sort({ orderNumber: -1 })
            .select('orderNumber');

        const slug = generateSlug(normalizedName, existingSlugs);
        existingSlugs.push(slug);

        topic = await Topic.create({
            name: normalizedName,
            slug,
            examId,
            subjectId,
            unitId,
            chapterId,
            orderNumber: (maxOrder?.orderNumber || 0) + 1,
            status: 'active'
        });
    } else {
        topic = await Topic.findByIdAndUpdate(topic._id, { name: normalizedName }, { new: true });
    }

    return topic;
};

// Helper: Find or Create SubTopic
const findOrCreateSubTopic = async (name, topicId, chapterId, unitId, subjectId, examId, existingSlugs) => {
    const normalizedName = toTitleCase(name.trim());

    let subTopic = await SubTopic.findOne({
        name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        topicId,
        chapterId,
        unitId,
        subjectId,
        examId
    });

    if (!subTopic) {
        const maxOrder = await SubTopic.findOne({ topicId, chapterId, unitId, subjectId, examId })
            .sort({ orderNumber: -1 })
            .select('orderNumber');

        const slug = generateSlug(normalizedName, existingSlugs);
        existingSlugs.push(slug);

        subTopic = await SubTopic.create({
            name: normalizedName,
            slug,
            examId,
            subjectId,
            unitId,
            chapterId,
            topicId,
            orderNumber: (maxOrder?.orderNumber || 0) + 1,
            status: 'active'
        });
    } else {
        subTopic = await SubTopic.findByIdAndUpdate(subTopic._id, { name: normalizedName }, { new: true });
    }

    return subTopic;
};

// Helper: Create Definition (always create new, check for duplicates)
const createDefinition = async (name, subTopicId, topicId, chapterId, unitId, subjectId, examId, existingSlugs, orderCounters) => {
    const normalizedName = toTitleCase(name.trim());

    // Check for duplicate
    const existing = await Definition.findOne({
        name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        subTopicId,
        topicId,
        chapterId,
        unitId,
        subjectId,
        examId
    });

    if (existing) {
        return await Definition.findByIdAndUpdate(existing._id, { name: normalizedName }, { new: true });
    }

    // Get Order Number based on CHAPTER (to match the chapterId_1_orderNumber_1 index)
    const orderKey = `definition:${chapterId}`;
    if (!orderCounters.has(orderKey)) {
        const maxDoc = await Definition.findOne({ chapterId, unitId, subjectId, examId })
            .sort({ orderNumber: -1 })
            .select('orderNumber');
        orderCounters.set(orderKey, maxDoc?.orderNumber || 0);
    }

    const nextOrder = orderCounters.get(orderKey) + 1;
    orderCounters.set(orderKey, nextOrder);

    const slug = generateSlug(normalizedName, existingSlugs);
    existingSlugs.push(slug);

    const definition = await Definition.create({
        name: normalizedName,
        slug,
        examId,
        subjectId,
        unitId,
        chapterId,
        topicId,
        subTopicId,
        orderNumber: nextOrder,
        status: 'active'
    });

    return definition;
};

export async function POST(request) {
    try {
        // 1. Auth Check
        const authCheck = await requireAction(request, "POST");
        if (authCheck.error) {
            return NextResponse.json(authCheck, { status: authCheck.status || 401 });
        }

        await connectDB();
        const body = await request.json();
        const { examId, subjectId, data } = body;

        // 2. Validate Context Lock
        if (!examId || !subjectId) {
            return NextResponse.json(
                { success: false, message: "Exam and Subject must be selected" },
                { status: 400 }
            );
        }

        if (!data || !Array.isArray(data) || data.length === 0) {
            return NextResponse.json(
                { success: false, message: "No data provided" },
                { status: 400 }
            );
        }

        // 3. Verify Exam and Subject exist
        const [exam, subject] = await Promise.all([
            Exam.findById(examId).select('name'),
            Subject.findById(subjectId).select('name examId')
        ]);

        if (!exam) {
            return NextResponse.json(
                { success: false, message: "Selected exam not found" },
                { status: 404 }
            );
        }

        if (!subject) {
            return NextResponse.json(
                { success: false, message: "Selected subject not found" },
                { status: 404 }
            );
        }

        // Verify subject belongs to exam
        if (subject.examId.toString() !== examId) {
            return NextResponse.json(
                { success: false, message: "Subject does not belong to the selected exam" },
                { status: 400 }
            );
        }

        // 4. Process CSV Data
        const stats = {
            exam: exam.name,
            subject: subject.name,
            unitsInserted: 0,
            chaptersInserted: 0,
            topicsInserted: 0,
            subtopicsInserted: 0,
            definitionsInserted: 0,
            rowsSkipped: 0,
            skipReasons: []
        };

        const createdUnits = new Set();
        const createdChapters = new Set();
        const createdTopics = new Set();
        const createdSubTopics = new Set();
        const existingSlugs = [];
        const orderCounters = new Map(); // Track order numbers per chapter for definitions

        for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
            const row = data[rowIndex];
            const rowNum = rowIndex + 1;

            try {
                // Normalize keys
                const normalizeKey = (key) => key.toLowerCase().replace(/[^a-z0-9]/g, '');
                const getField = (fieldName) => {
                    const key = Object.keys(row).find(k => normalizeKey(k).includes(fieldName));
                    return row[key]?.trim();
                };

                const unitName = getField('unit');
                const chapterName = getField('chapter');
                const topicName = getField('topic');
                const subTopicName = getField('subtopic');
                const definitionName = getField('definition');

                // Skip empty rows
                if (!unitName && !chapterName && !topicName && !subTopicName && !definitionName) {
                    stats.rowsSkipped++;
                    stats.skipReasons.push(`Row ${rowNum}: Empty row`);
                    continue;
                }

                // Validate required fields
                if (!unitName || !chapterName || !topicName || !subTopicName || !definitionName) {
                    stats.rowsSkipped++;
                    stats.skipReasons.push(`Row ${rowNum}: Missing required fields`);
                    continue;
                }

                // 5. Find or Create hierarchy
                const unit = await findOrCreateUnit(unitName, subjectId, examId, existingSlugs);
                if (!createdUnits.has(unit._id.toString())) {
                    createdUnits.add(unit._id.toString());
                    stats.unitsInserted++;
                }

                const chapter = await findOrCreateChapter(chapterName, unit._id, subjectId, examId, row, existingSlugs);
                if (!createdChapters.has(chapter._id.toString())) {
                    createdChapters.add(chapter._id.toString());
                    stats.chaptersInserted++;
                }

                const topic = await findOrCreateTopic(topicName, chapter._id, unit._id, subjectId, examId, existingSlugs);
                if (!createdTopics.has(topic._id.toString())) {
                    createdTopics.add(topic._id.toString());
                    stats.topicsInserted++;
                }

                const subTopic = await findOrCreateSubTopic(subTopicName, topic._id, chapter._id, unit._id, subjectId, examId, existingSlugs);
                if (!createdSubTopics.has(subTopic._id.toString())) {
                    createdSubTopics.add(subTopic._id.toString());
                    stats.subtopicsInserted++;
                }

                // Create Definition (always new)
                await createDefinition(
                    definitionName,
                    subTopic._id,
                    topic._id,
                    chapter._id,
                    unit._id,
                    subjectId,
                    examId,
                    existingSlugs,
                    orderCounters
                );
                stats.definitionsInserted++;

            } catch (err) {
                stats.rowsSkipped++;
                stats.skipReasons.push(`Row ${rowNum}: ${err.message}`);
                console.error(`Row ${rowNum} Error:`, err);
            }
        }

        return NextResponse.json({
            success: true,
            data: stats,
            message: `Import completed. ${stats.definitionsInserted} definitions created, ${stats.rowsSkipped} rows skipped.`
        });

    } catch (error) {
        console.error("Context-Locked Import Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
