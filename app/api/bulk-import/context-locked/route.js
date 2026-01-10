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
import { createSlug, generateUniqueSlug } from "@/utils/serverSlug";

// Increase max duration for bulk imports (5 minutes = 300 seconds)
// This allows the API route to run longer than the default timeout
export const maxDuration = 300; // 5 minutes in seconds

/**
 * Production-ready Context-Locked Bulk Import API
 * 
 * RULES:
 * - Exam and Subject are LOCKED (selected from UI)
 * - CSV can only create: Unit → Chapter → Topic → SubTopic → Definition
 * - Uses findOrCreate pattern to prevent duplicates (with override support)
 * - Maintains strict parent-child ID mapping
 * - Skips invalid rows without stopping the import
 * - Generates slugs for all items (new and existing if name changed)
 * - Overrides existing data when names match (case-insensitive)
 * 
 * INCREMENTAL IMPORT SUPPORT:
 * - ✅ Supports adding new data after existing imports
 * - ✅ Automatically calculates correct order numbers for new items
 * - ✅ Updates existing items if names match (case-insensitive)
 * - ✅ Creates new items if they don't exist
 * - ✅ Handles duplicate key errors gracefully
 * - ✅ Partial hierarchy support - imports whatever is available (Unit only, Unit+Chapter, etc.)
 * - ✅ Always queries database for latest max order numbers to ensure correct sequencing
 * 
 * EXAMPLE SCENARIOS:
 * - First import: 100 rows with full hierarchy → All created
 * - Second import: 50 new rows with full hierarchy → New items created after existing ones
 * - Third import: Rows with only Units → Units created/updated, other levels skipped gracefully
 * - Fourth import: Same data as first → Existing items updated, no duplicates created
 */

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

// Helper: Find or Create Unit (with override support)
const findOrCreateUnit = async (name, subjectId, examId, existingSlugs) => {
    const normalizedName = toTitleCase(name.trim());

    let unit = await Unit.findOne({
        name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        subjectId,
        examId
    });

    // Generate unique slug
    const baseSlug = createSlug(normalizedName);
    const checkSlugExists = async (slug, excludeId) => {
        const query = { subjectId, examId, slug };
        if (excludeId) query._id = { $ne: excludeId };
        const existing = await Unit.findOne(query);
        return !!existing || existingSlugs.includes(slug);
    };
    
    const slug = await generateUniqueSlug(baseSlug, checkSlugExists, unit?._id || null);
    existingSlugs.push(slug);

    if (!unit) {
        // Always query database for latest max order number to ensure incremental imports work
        // This ensures new data added after existing data gets correct order numbers
        const maxOrder = await Unit.findOne({ subjectId, examId })
            .sort({ orderNumber: -1 })
            .select('orderNumber')
            .lean();

        // Calculate next order number - ensures incremental imports continue from where existing data left off
        const nextOrderNumber = (maxOrder?.orderNumber || 0) + 1;
        
        try {
            unit = await Unit.create({
                name: normalizedName,
                slug,
                examId,
                subjectId,
                orderNumber: nextOrderNumber,
                status: 'active'
            });
            return { unit, wasCreated: true };
        } catch (createErr) {
            // Handle duplicate key errors (slug or orderNumber conflict)
            if (createErr.code === 11000) {
                console.warn(`⚠️ Unit creation conflict detected for "${normalizedName}". Attempting to find existing...`);
                // Try to find by slug if orderNumber conflict
                const existingBySlug = await Unit.findOne({ subjectId, examId, slug });
                if (existingBySlug) {
                    console.log(`✅ Found existing Unit by slug, updating instead...`);
                    unit = await Unit.findByIdAndUpdate(
                        existingBySlug._id,
                        { name: normalizedName },
                        { new: true, runValidators: true }
                    );
                    return { unit, wasCreated: false };
                }
                // If still not found, re-throw the error
                throw createErr;
            }
            throw createErr;
        }
    } else {
        // Override existing unit - update name and regenerate slug if name changed
        // If name changed significantly, regenerate slug; otherwise keep existing
        const nameChanged = unit.name.toLowerCase() !== normalizedName.toLowerCase();
        const finalSlug = (nameChanged || !unit.slug) ? slug : unit.slug;
        
        unit = await Unit.findByIdAndUpdate(
            unit._id, 
            { 
                name: normalizedName,
                slug: finalSlug // Regenerate if name changed or missing
            }, 
            { new: true, runValidators: true }
        );
        
        // Verify slug was saved
        if (!unit.slug) {
            console.warn(`⚠️ Unit ${unit._id} missing slug after update, fixing...`);
            unit.slug = slug;
            await unit.save();
        }
        
        return { unit, wasCreated: false };
    }
};

// Helper: Find or Create Chapter (with override support)
const findOrCreateChapter = async (name, unitId, subjectId, examId, rowData, existingSlugs) => {
    const normalizedName = toTitleCase(name.trim());

    let chapter = await Chapter.findOne({
        name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        unitId,
        subjectId,
        examId
    });

    // Generate unique slug
    const baseSlug = createSlug(normalizedName);
    const checkSlugExists = async (slug, excludeId) => {
        const query = { unitId, subjectId, examId, slug };
        if (excludeId) query._id = { $ne: excludeId };
        const existing = await Chapter.findOne(query);
        return !!existing || existingSlugs.includes(slug);
    };
    
    const slug = await generateUniqueSlug(baseSlug, checkSlugExists, chapter?._id || null);
    existingSlugs.push(slug);

    if (!chapter) {
        // Always query database for latest max order number to ensure incremental imports work
        const maxOrder = await Chapter.findOne({ unitId, subjectId, examId })
            .sort({ orderNumber: -1 })
            .select('orderNumber')
            .lean();

        // Calculate next order number - ensures new chapters are added after existing ones
        const nextOrderNumber = (maxOrder?.orderNumber || 0) + 1;
        
        try {
            chapter = await Chapter.create({
                name: normalizedName,
                slug,
                examId,
                subjectId,
                unitId,
                orderNumber: nextOrderNumber,
                weightage: rowData.weightage ? parseInt(rowData.weightage) : 0,
                time: rowData.time ? parseInt(rowData.time) : 0,
                questions: rowData.questions ? parseInt(rowData.questions) : 0,
                status: 'active'
            });
            return { chapter, wasCreated: true };
        } catch (createErr) {
            // Handle duplicate key errors
            if (createErr.code === 11000) {
                console.warn(`⚠️ Chapter creation conflict for "${normalizedName}". Finding existing...`);
                const existingBySlug = await Chapter.findOne({ unitId, subjectId, examId, slug });
                if (existingBySlug) {
                    chapter = await Chapter.findByIdAndUpdate(
                        existingBySlug._id,
                        { 
                            name: normalizedName,
                            weightage: rowData.weightage ? parseInt(rowData.weightage) : existingBySlug.weightage,
                            time: rowData.time ? parseInt(rowData.time) : existingBySlug.time,
                            questions: rowData.questions ? parseInt(rowData.questions) : existingBySlug.questions
                        },
                        { new: true, runValidators: true }
                    );
                    return { chapter, wasCreated: false };
                }
                throw createErr;
            }
            throw createErr;
        }
    } else {
        // Override existing chapter - update all fields and regenerate slug if name changed
        const nameChanged = chapter.name.toLowerCase() !== normalizedName.toLowerCase();
        const finalSlug = (nameChanged || !chapter.slug) ? slug : chapter.slug;
        
        const updatePayload = { 
            name: normalizedName,
            slug: finalSlug // Regenerate if name changed or missing
        };
        if (rowData.weightage !== undefined) updatePayload.weightage = parseInt(rowData.weightage) || 0;
        if (rowData.time !== undefined) updatePayload.time = parseInt(rowData.time) || 0;
        if (rowData.questions !== undefined) updatePayload.questions = parseInt(rowData.questions) || 0;

        chapter = await Chapter.findByIdAndUpdate(chapter._id, updatePayload, { new: true, runValidators: true });
        
        // Verify slug was saved
        if (!chapter.slug) {
            console.warn(`⚠️ Chapter ${chapter._id} missing slug after update, fixing...`);
            chapter.slug = slug;
            await chapter.save();
        }
        
        return { chapter, wasCreated: false };
    }
};

// Helper: Find or Create Topic (with override support)
const findOrCreateTopic = async (name, chapterId, unitId, subjectId, examId, existingSlugs) => {
    const normalizedName = toTitleCase(name.trim());

    let topic = await Topic.findOne({
        name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        chapterId,
        unitId,
        subjectId,
        examId
    });

    // Generate unique slug
    const baseSlug = createSlug(normalizedName);
    const checkSlugExists = async (slug, excludeId) => {
        const query = { chapterId, unitId, subjectId, examId, slug };
        if (excludeId) query._id = { $ne: excludeId };
        const existing = await Topic.findOne(query);
        return !!existing || existingSlugs.includes(slug);
    };
    
    const slug = await generateUniqueSlug(baseSlug, checkSlugExists, topic?._id || null);
    existingSlugs.push(slug);

    if (!topic) {
        // Always query database for latest max order number to ensure incremental imports work
        const maxOrder = await Topic.findOne({ chapterId, unitId, subjectId, examId })
            .sort({ orderNumber: -1 })
            .select('orderNumber')
            .lean();

        // Calculate next order number - ensures new topics are added after existing ones
        const nextOrderNumber = (maxOrder?.orderNumber || 0) + 1;
        
        try {
            topic = await Topic.create({
                name: normalizedName,
                slug,
                examId,
                subjectId,
                unitId,
                chapterId,
                orderNumber: nextOrderNumber,
                status: 'active'
            });
            return { topic, wasCreated: true };
        } catch (createErr) {
            // Handle duplicate key errors
            if (createErr.code === 11000) {
                console.warn(`⚠️ Topic creation conflict for "${normalizedName}". Finding existing...`);
                const existingBySlug = await Topic.findOne({ chapterId, unitId, subjectId, examId, slug });
                if (existingBySlug) {
                    topic = await Topic.findByIdAndUpdate(
                        existingBySlug._id,
                        { name: normalizedName },
                        { new: true, runValidators: true }
                    );
                    return { topic, wasCreated: false };
                }
                throw createErr;
            }
            throw createErr;
        }
    } else {
        // Override existing topic - update name and regenerate slug if name changed
        const nameChanged = topic.name.toLowerCase() !== normalizedName.toLowerCase();
        const finalSlug = (nameChanged || !topic.slug) ? slug : topic.slug;
        
        topic = await Topic.findByIdAndUpdate(
            topic._id, 
            { 
                name: normalizedName,
                slug: finalSlug // Regenerate if name changed or missing
            }, 
            { new: true, runValidators: true }
        );
        
        // Verify slug was saved
        if (!topic.slug) {
            console.warn(`⚠️ Topic ${topic._id} missing slug after update, fixing...`);
            topic.slug = slug;
            await topic.save();
        }
        
        return { topic, wasCreated: false };
    }
};

// Helper: Find or Create SubTopic (with override support)
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

    // Generate unique slug
    const baseSlug = createSlug(normalizedName);
    const checkSlugExists = async (slug, excludeId) => {
        const query = { topicId, chapterId, unitId, subjectId, examId, slug };
        if (excludeId) query._id = { $ne: excludeId };
        const existing = await SubTopic.findOne(query);
        return !!existing || existingSlugs.includes(slug);
    };
    
    const slug = await generateUniqueSlug(baseSlug, checkSlugExists, subTopic?._id || null);
    existingSlugs.push(slug);

    if (!subTopic) {
        // Always query database for latest max order number to ensure incremental imports work
        const maxOrder = await SubTopic.findOne({ topicId, chapterId, unitId, subjectId, examId })
            .sort({ orderNumber: -1 })
            .select('orderNumber')
            .lean();

        // Calculate next order number - ensures new subtopics are added after existing ones
        const nextOrderNumber = (maxOrder?.orderNumber || 0) + 1;
        
        try {
            subTopic = await SubTopic.create({
                name: normalizedName,
                slug,
                examId,
                subjectId,
                unitId,
                chapterId,
                topicId,
                orderNumber: nextOrderNumber,
                status: 'active'
            });
            return { subTopic, wasCreated: true };
        } catch (createErr) {
            // Handle duplicate key errors
            if (createErr.code === 11000) {
                console.warn(`⚠️ SubTopic creation conflict for "${normalizedName}". Finding existing...`);
                const existingBySlug = await SubTopic.findOne({ topicId, chapterId, unitId, subjectId, examId, slug });
                if (existingBySlug) {
                    subTopic = await SubTopic.findByIdAndUpdate(
                        existingBySlug._id,
                        { name: normalizedName },
                        { new: true, runValidators: true }
                    );
                    return { subTopic, wasCreated: false };
                }
                throw createErr;
            }
            throw createErr;
        }
    } else {
        // Override existing subtopic - update name and regenerate slug if name changed
        const nameChanged = subTopic.name.toLowerCase() !== normalizedName.toLowerCase();
        const finalSlug = (nameChanged || !subTopic.slug) ? slug : subTopic.slug;
        
        subTopic = await SubTopic.findByIdAndUpdate(
            subTopic._id, 
            { 
                name: normalizedName,
                slug: finalSlug // Regenerate if name changed or missing
            }, 
            { new: true, runValidators: true }
        );
        
        // Verify slug was saved
        if (!subTopic.slug) {
            console.warn(`⚠️ SubTopic ${subTopic._id} missing slug after update, fixing...`);
            subTopic.slug = slug;
            await subTopic.save();
        }
        
        return { subTopic, wasCreated: false };
    }
};

// Helper: Create or Update Definition (with override support and slug verification)
const createDefinition = async (name, subTopicId, topicId, chapterId, unitId, subjectId, examId, existingSlugs, orderCounters) => {
    const normalizedName = toTitleCase(name.trim());

    // Check for duplicate (chapterId is optional, so handle null case)
    // Definition uniqueness is based on: name, subTopicId, topicId, unitId, subjectId, examId
    // chapterId is optional and doesn't affect uniqueness
    const duplicateQuery = {
        name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        subTopicId,
        topicId,
        unitId,
        subjectId,
        examId
    };
    // Note: chapterId is optional, so we don't include it in the duplicate check
    // Multiple definitions can exist with same name but different chapterId (or null)
    // The unique constraint is on subTopicId + slug, not on chapterId
    
    const existing = await Definition.findOne(duplicateQuery);

    // Generate unique slug (chapterId is optional, so handle null case)
    const baseSlug = createSlug(normalizedName);
    const checkSlugExists = async (slug, excludeId) => {
        // Definition uniqueness is based on subTopicId + slug (not chapterId)
        // So we don't need to include chapterId in the slug uniqueness check
        const query = { subTopicId, topicId, unitId, subjectId, examId, slug };
        if (excludeId) query._id = { $ne: excludeId };
        const existingDef = await Definition.findOne(query);
        return !!existingDef || existingSlugs.includes(slug);
    };
    
    const slug = await generateUniqueSlug(baseSlug, checkSlugExists, existing?._id || null);
    existingSlugs.push(slug);

    if (existing) {
        // Override existing definition - update name and regenerate slug if name changed
        const nameChanged = existing.name.toLowerCase() !== normalizedName.toLowerCase();
        const finalSlug = (nameChanged || !existing.slug) ? slug : existing.slug;
        
        const updated = await Definition.findByIdAndUpdate(
            existing._id, 
            { 
                name: normalizedName,
                slug: finalSlug // Regenerate if name changed or missing
            }, 
            { new: true, runValidators: true }
        );
        
        // Verify slug was saved
        if (!updated.slug) {
            console.warn(`⚠️ Definition ${updated._id} missing slug after update, fixing...`);
            updated.slug = slug;
            await updated.save();
        }
        
        return { definition: updated, wasCreated: false };
    }

    // Get Order Number based on SubTopic (since Definition is indexed by subTopicId, not chapterId)
    // chapterId is optional for Definition, so we use subTopicId as the key
    // IMPORTANT: Always query database for latest max to handle incremental imports correctly
    // Don't rely solely on cache as database may have been updated by previous imports
    const orderKey = `definition:${subTopicId}`;
    
    // Always query database for the latest max order number to ensure incremental imports work
    // This ensures new data added after existing data gets correct order numbers
    const query = { subTopicId, topicId, unitId, subjectId, examId };
    if (chapterId) query.chapterId = chapterId; // Only include chapterId if it exists
    
    const maxDoc = await Definition.findOne(query)
        .sort({ orderNumber: -1 })
        .select('orderNumber')
        .lean();
    
    // Get the max order number from database, but use cache if it's higher (for same-batch processing)
    const dbMaxOrder = maxDoc?.orderNumber || 0;
    const cacheMaxOrder = orderCounters.get(orderKey) || 0;
    const currentMax = Math.max(dbMaxOrder, cacheMaxOrder);
    
    // Set the next order number (increment from current max)
    const nextOrder = currentMax + 1;
    orderCounters.set(orderKey, nextOrder);

    try {
        const definition = await Definition.create({
            name: normalizedName,
            slug,
            examId,
            subjectId,
            unitId,
            chapterId: chapterId || null, // Allow null chapterId (optional)
            topicId,
            subTopicId,
            orderNumber: nextOrder,
            status: 'active'
        });

        // Verify slug was saved
        if (!definition.slug) {
            console.error(`❌ Definition ${definition._id} created without slug! Attempting to fix...`);
            definition.slug = slug;
            await definition.save();
        }

        return { definition, wasCreated: true };
    } catch (createErr) {
        // Handle duplicate key errors (orderNumber or slug conflict)
        if (createErr.code === 11000) {
            console.warn(`⚠️ Definition creation conflict for "${normalizedName}". Attempting recovery...`);
            
            // Try to find existing definition and update it
            const recoveryQuery = {
                name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                subTopicId,
                topicId,
                unitId,
                subjectId,
                examId
            };
            if (chapterId) recoveryQuery.chapterId = chapterId;
            
            const existingDef = await Definition.findOne(recoveryQuery);
            if (existingDef) {
                console.log(`✅ Found existing Definition, updating instead...`);
                const updated = await Definition.findByIdAndUpdate(
                    existingDef._id,
                    { 
                        name: normalizedName,
                        slug: existingDef.slug || slug // Keep existing slug if present
                    },
                    { new: true, runValidators: true }
                );
                return { definition: updated, wasCreated: false };
            }
            
            // If still can't find, it might be an orderNumber conflict - try with next available order
            console.warn(`⚠️ Order number conflict detected. Finding next available order number...`);
            const maxDoc = await Definition.findOne({ subTopicId, topicId, unitId, subjectId, examId })
                .sort({ orderNumber: -1 })
                .select('orderNumber')
                .lean();
            
            const alternativeOrder = (maxDoc?.orderNumber || 0) + 1;
            orderCounters.set(orderKey, alternativeOrder);
            
            const definition = await Definition.create({
                name: normalizedName,
                slug,
                examId,
                subjectId,
                unitId,
                chapterId: chapterId || null,
                topicId,
                subTopicId,
                orderNumber: alternativeOrder,
                status: 'active'
            });
            
            return { definition, wasCreated: true };
        }
        
        // Re-throw other errors
        throw createErr;
    }
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

        // 4. Process CSV Data with proper tracking
        const stats = {
            exam: exam.name,
            subject: subject.name,
            unitsCreated: 0,
            unitsUpdated: 0,
            chaptersCreated: 0,
            chaptersUpdated: 0,
            topicsCreated: 0,
            topicsUpdated: 0,
            subtopicsCreated: 0,
            subtopicsUpdated: 0,
            definitionsCreated: 0,
            definitionsUpdated: 0,
            rowsSkipped: 0,
            skipReasons: [],
            slugsGenerated: 0
        };

        const processedUnits = new Set(); // Track processed units to avoid duplicate counts
        const processedChapters = new Set();
        const processedTopics = new Set();
        const processedSubTopics = new Set();
        const existingSlugs = [];
        const orderCounters = new Map(); // Track order numbers per chapter for definitions

        console.log(`🔄 Starting import of ${data.length} rows...`);

        for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
            const row = data[rowIndex];
            const rowNum = rowIndex + 1;

            try {
                // Normalize keys - handle various CSV header formats
                const normalizeKey = (key) => key.toLowerCase().replace(/[^a-z0-9]/g, '');
                const getField = (fieldName) => {
                    const key = Object.keys(row).find(k => {
                        const normalized = normalizeKey(k);
                        return normalized === fieldName || normalized.includes(fieldName);
                    });
                    const value = row[key];
                    // Handle empty strings, null, undefined - treat as missing
                    if (value === null || value === undefined || value === '') {
                        return null;
                    }
                    const trimmed = String(value).trim();
                    return trimmed === '' ? null : trimmed;
                };

                const unitName = getField('unit');
                const chapterName = getField('chapter');
                const topicName = getField('topic');
                const subTopicName = getField('subtopic');
                const definitionName = getField('definition');

                // Skip completely empty rows
                if (!unitName && !chapterName && !topicName && !subTopicName && !definitionName) {
                    stats.rowsSkipped++;
                    stats.skipReasons.push(`Row ${rowNum}: Empty row (all fields empty)`);
                    continue;
                }

                // Minimum requirement: Unit must be present (in context-locked mode)
                if (!unitName) {
                    stats.rowsSkipped++;
                    stats.skipReasons.push(`Row ${rowNum}: Unit is required but missing`);
                    continue;
                }

                // 5. Import partial hierarchy - create only what's available
                // Level 1: Unit (always required)
                const { unit, wasCreated: unitCreated } = await findOrCreateUnit(unitName, subjectId, examId, existingSlugs);
                if (!processedUnits.has(unit._id.toString())) {
                    processedUnits.add(unit._id.toString());
                    if (unitCreated) {
                        stats.unitsCreated++;
                        stats.slugsGenerated++;
                        console.log(`✅ Row ${rowNum}: Created Unit "${unitName}"`);
                    } else {
                        stats.unitsUpdated++;
                        console.log(`🔄 Row ${rowNum}: Updated Unit "${unitName}"`);
                    }
                }

                // Level 2: Chapter (optional - only create if chapterName provided)
                let chapter = null;
                let chapterCreated = false;
                if (chapterName) {
                    const result = await findOrCreateChapter(chapterName, unit._id, subjectId, examId, row, existingSlugs);
                    chapter = result.chapter;
                    chapterCreated = result.wasCreated;
                    
                    if (!processedChapters.has(chapter._id.toString())) {
                        processedChapters.add(chapter._id.toString());
                        if (chapterCreated) {
                            stats.chaptersCreated++;
                            stats.slugsGenerated++;
                            console.log(`✅ Row ${rowNum}: Created Chapter "${chapterName}" under Unit "${unitName}"`);
                        } else {
                            stats.chaptersUpdated++;
                            console.log(`🔄 Row ${rowNum}: Updated Chapter "${chapterName}" under Unit "${unitName}"`);
                        }
                    }
                }

                // Level 3: Topic (optional - only create if topicName provided AND chapter exists)
                let topic = null;
                let topicCreated = false;
                if (topicName) {
                    if (chapter) {
                        const result = await findOrCreateTopic(topicName, chapter._id, unit._id, subjectId, examId, existingSlugs);
                        topic = result.topic;
                        topicCreated = result.wasCreated;
                        
                        if (!processedTopics.has(topic._id.toString())) {
                            processedTopics.add(topic._id.toString());
                            if (topicCreated) {
                                stats.topicsCreated++;
                                stats.slugsGenerated++;
                                console.log(`✅ Row ${rowNum}: Created Topic "${topicName}" under Chapter "${chapterName}"`);
                            } else {
                                stats.topicsUpdated++;
                                console.log(`🔄 Row ${rowNum}: Updated Topic "${topicName}" under Chapter "${chapterName}"`);
                            }
                        }
                    } else {
                        // Topic provided but Chapter missing - warning only, not an error
                        // The Unit and Chapter (if provided) were still imported successfully
                        console.warn(`⚠️ Row ${rowNum}: Topic "${topicName}" requires Chapter. Topic not created, but Unit/Chapter were imported.`);
                        // Don't add to skipReasons - partial import is acceptable
                        // Don't increment rowsSkipped - row was processed successfully
                    }
                }

                // Level 4: SubTopic (optional - only create if subTopicName provided AND topic exists)
                let subTopic = null;
                let subTopicCreated = false;
                if (subTopicName) {
                    if (topic && chapter) {
                        const result = await findOrCreateSubTopic(subTopicName, topic._id, chapter._id, unit._id, subjectId, examId, existingSlugs);
                        subTopic = result.subTopic;
                        subTopicCreated = result.wasCreated;
                        
                        if (!processedSubTopics.has(subTopic._id.toString())) {
                            processedSubTopics.add(subTopic._id.toString());
                            if (subTopicCreated) {
                                stats.subtopicsCreated++;
                                stats.slugsGenerated++;
                                console.log(`✅ Row ${rowNum}: Created SubTopic "${subTopicName}" under Topic "${topicName}"`);
                            } else {
                                stats.subtopicsUpdated++;
                                console.log(`🔄 Row ${rowNum}: Updated SubTopic "${subTopicName}" under Topic "${topicName}"`);
                            }
                        }
                    } else {
                        // SubTopic provided but parent hierarchy incomplete - warning only
                        // The Unit/Chapter/Topic levels were still imported successfully
                        console.warn(`⚠️ Row ${rowNum}: SubTopic "${subTopicName}" requires Topic and Chapter. SubTopic not created, but other hierarchy levels were imported.`);
                        // Don't add to skipReasons - partial import is acceptable
                        // Don't increment rowsSkipped - row was processed successfully
                    }
                }

                // Level 5: Definition (optional - only create if definitionName provided AND required parents exist)
                if (definitionName) {
                    // Definition requires: subTopicId, topicId, unitId (chapterId is optional but preferred)
                    if (subTopic && topic) {
                        const chapterIdForDefinition = chapter?._id || null;
                        const { definition, wasCreated: definitionCreated } = await createDefinition(
                            definitionName,
                            subTopic._id,
                            topic._id,
                            chapterIdForDefinition,
                            unit._id,
                            subjectId,
                            examId,
                            existingSlugs,
                            orderCounters
                        );
                        
                        if (definitionCreated) {
                            stats.definitionsCreated++;
                            stats.slugsGenerated++;
                            console.log(`✅ Row ${rowNum}: Created Definition "${definitionName}" under SubTopic "${subTopicName}"`);
                        } else {
                            stats.definitionsUpdated++;
                            console.log(`🔄 Row ${rowNum}: Updated Definition "${definitionName}" under SubTopic "${subTopicName}"`);
                        }

                        // Verify slug exists after creation/update
                        if (!definition.slug) {
                            console.error(`❌ Row ${rowNum}: Definition ${definition._id} has no slug!`);
                            stats.skipReasons.push(`Row ${rowNum}: Definition slug missing after import`);
                        }
                    } else {
                        // Definition provided but parent hierarchy incomplete - this is a warning, not an error
                        // The Unit/Chapter/Topic/SubTopic levels were still imported successfully
                        console.warn(`⚠️ Row ${rowNum}: Definition "${definitionName}" requires SubTopic and Topic. Definition not created, but hierarchy levels were imported.`);
                        // Don't add to skipReasons as this is not a fatal error - partial import is acceptable
                    }
                }
                
                // Row processed successfully (even if some levels weren't created due to missing parents)
                // This is expected behavior for partial hierarchies - don't mark as skipped
                console.log(`✅ Row ${rowNum}: Processed successfully. Unit: ${!!unitName}, Chapter: ${!!chapterName}, Topic: ${!!topicName}, SubTopic: ${!!subTopicName}, Definition: ${!!definitionName}`);

            } catch (err) {
                // Enhanced error handling for various error types
                let errorMessage = err.message || err.toString();
                let shouldSkip = true;
                
                // Handle MongoDB duplicate key errors (unique constraint violations)
                if (err.code === 11000 || err.name === 'MongoServerError' || err.message?.includes('duplicate key')) {
                    const duplicateField = err.keyPattern ? Object.keys(err.keyPattern)[0] : 'unknown';
                    errorMessage = `Duplicate ${duplicateField} detected. Item may already exist.`;
                    console.warn(`⚠️ Row ${rowNum}: ${errorMessage} - Attempting to find and update existing item...`);
                    
                    // Try to recover by finding the existing item and updating it instead
                    try {
                        // Extract the duplicate key value from error
                        const duplicateValue = err.keyValue ? Object.values(err.keyValue)[0] : null;
                        
                        if (duplicateField === 'orderNumber' || duplicateField === 'slug') {
                            // For orderNumber/slug conflicts, try to find by name and update
                            console.log(`🔄 Row ${rowNum}: Attempting recovery for duplicate ${duplicateField}...`);
                            // The findOrCreate functions should handle this, but if they don't, log it
                            errorMessage = `Duplicate ${duplicateField} - item may need manual review`;
                        }
                    } catch (recoveryErr) {
                        console.error(`❌ Row ${rowNum}: Recovery failed:`, recoveryErr);
                    }
                }
                
                // Handle validation errors
                if (err.name === 'ValidationError') {
                    const validationErrors = Object.values(err.errors || {}).map(e => e.message).join(', ');
                    errorMessage = `Validation failed: ${validationErrors || err.message}`;
                }
                
                // Handle cast errors (invalid ObjectId, etc.)
                if (err.name === 'CastError') {
                    errorMessage = `Invalid data format: ${err.path || 'unknown field'}`;
                }
                
                // Only mark as skipped if there's an actual error during processing
                stats.rowsSkipped++;
                stats.skipReasons.push(`Row ${rowNum}: ${errorMessage}`);
                console.error(`❌ Row ${rowNum} Error:`, {
                    message: errorMessage,
                    code: err.code,
                    name: err.name,
                    stack: err.stack
                });
            }
        }

        console.log(`✅ Import completed. Stats:`, stats);

        // Build comprehensive success message
        const totalProcessed = data.length - stats.rowsSkipped;
        const totalCreated = stats.unitsCreated + stats.chaptersCreated + stats.topicsCreated + stats.subtopicsCreated + stats.definitionsCreated;
        const totalUpdated = stats.unitsUpdated + stats.chaptersUpdated + stats.topicsUpdated + stats.subtopicsUpdated + stats.definitionsUpdated;

        // Build success message with incremental import support info
        const successMessage = `Import completed! ✅\n` +
            `📦 Created: ${totalCreated} items (${stats.unitsCreated} Units, ${stats.chaptersCreated} Chapters, ${stats.topicsCreated} Topics, ${stats.subtopicsCreated} SubTopics, ${stats.definitionsCreated} Definitions)\n` +
            `🔄 Updated: ${totalUpdated} items (${stats.unitsUpdated} Units, ${stats.chaptersUpdated} Chapters, ${stats.topicsUpdated} Topics, ${stats.subtopicsUpdated} SubTopics, ${stats.definitionsUpdated} Definitions)\n` +
            `📊 Processed: ${totalProcessed} rows successfully\n` +
            (stats.rowsSkipped > 0 ? `⚠️ Skipped: ${stats.rowsSkipped} rows\n` : '') +
            `🏷️ Generated: ${stats.slugsGenerated} slugs\n` +
            `\n💡 Tip: You can import more data anytime - the system will add new items and update existing ones automatically!`;
        
        return NextResponse.json({
            success: true,
            data: {
                ...stats,
                totalProcessed,
                totalCreated,
                totalUpdated,
                // Backward compatibility aliases
                unitsInserted: stats.unitsCreated + stats.unitsUpdated,
                chaptersInserted: stats.chaptersCreated + stats.chaptersUpdated,
                topicsInserted: stats.topicsCreated + stats.topicsUpdated,
                subtopicsInserted: stats.subtopicsCreated + stats.subtopicsUpdated,
                definitionsInserted: stats.definitionsCreated + stats.definitionsUpdated
            },
            message: successMessage
        });

    } catch (error) {
        console.error("❌ Context-Locked Import Error:", error);
        
        // Enhanced error handling with detailed messages
        let errorMessage = "Internal Server Error";
        let statusCode = 500;
        
        if (error.name === 'ValidationError') {
            errorMessage = `Validation Error: ${error.message}`;
            statusCode = 400;
        } else if (error.code === 11000 || error.message?.includes('duplicate key')) {
            errorMessage = `Duplicate key error: Data already exists. Please check for duplicates.`;
            statusCode = 409; // Conflict
        } else if (error.name === 'CastError') {
            errorMessage = `Invalid data format: ${error.message}`;
            statusCode = 400;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        // Log full error details for debugging
        console.error("Error Details:", {
            name: error.name,
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        
        return NextResponse.json(
            { 
                success: false, 
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? {
                    name: error.name,
                    code: error.code,
                    message: error.message
                } : undefined
            },
            { status: statusCode }
        );
    }
}
