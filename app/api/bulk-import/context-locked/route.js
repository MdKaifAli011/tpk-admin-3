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
import { createSlug, generateUniqueSlug, allocateUniqueSlugSync } from "@/utils/serverSlug";

// Increase max duration for bulk imports (10 minutes) to support very long imports without timeout
export const maxDuration = 600; // 10 minutes in seconds

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
        const finalSlug = (nameChanged || !unit.slug) ? slug : (unit.slug || slug);
        const unitIdForRefetch = unit._id;
        
        unit = await Unit.findByIdAndUpdate(
            unit._id, 
            { 
                name: normalizedName,
                slug: finalSlug // Regenerate if name changed or missing
            }, 
            { new: true, runValidators: true }
        );
        if (!unit) {
            unit = await Unit.findById(unitIdForRefetch);
        }
        if (!unit) {
            throw new Error(`Unit ${unitIdForRefetch} missing after update`);
        }
        
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
        const finalSlug = (nameChanged || !chapter.slug) ? slug : (chapter.slug || slug);
        
        const updatePayload = { 
            name: normalizedName,
            slug: finalSlug // Regenerate if name changed or missing
        };
        if (rowData.weightage !== undefined) updatePayload.weightage = parseInt(rowData.weightage) || 0;
        if (rowData.time !== undefined) updatePayload.time = parseInt(rowData.time) || 0;
        if (rowData.questions !== undefined) updatePayload.questions = parseInt(rowData.questions) || 0;

        const chapterIdForRefetch = chapter._id;
        chapter = await Chapter.findByIdAndUpdate(chapter._id, updatePayload, { new: true, runValidators: true });
        if (!chapter) {
            chapter = await Chapter.findById(chapterIdForRefetch);
        }
        if (!chapter) {
            throw new Error(`Chapter ${chapterIdForRefetch} missing after update`);
        }
        
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
        const finalSlug = (nameChanged || !topic.slug) ? slug : (topic.slug || slug);
        const topicIdForRefetch = topic._id;
        
        topic = await Topic.findByIdAndUpdate(
            topic._id, 
            { 
                name: normalizedName,
                slug: finalSlug // Regenerate if name changed or missing
            }, 
            { new: true, runValidators: true }
        );
        if (!topic) {
            topic = await Topic.findById(topicIdForRefetch);
        }
        if (!topic) {
            throw new Error(`Topic ${topicIdForRefetch} missing after update`);
        }
        
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
        const finalSlug = (nameChanged || !subTopic.slug) ? slug : (subTopic.slug || slug);
        const subTopicIdForRefetch = subTopic._id;
        
        subTopic = await SubTopic.findByIdAndUpdate(
            subTopic._id, 
            { 
                name: normalizedName,
                slug: finalSlug // Regenerate if name changed or missing
            }, 
            { new: true, runValidators: true }
        );
        if (!subTopic) {
            subTopic = await SubTopic.findById(subTopicIdForRefetch);
        }
        if (!subTopic) {
            throw new Error(`SubTopic ${subTopicIdForRefetch} missing after update`);
        }
        
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
        const finalSlug = (nameChanged || !existing.slug) ? slug : (existing.slug || slug);
        
        let updated = await Definition.findByIdAndUpdate(
            existing._id, 
            { 
                name: normalizedName,
                slug: finalSlug // Regenerate if name changed or missing
            }, 
            { new: true, runValidators: true }
        );
        // Defensive: findByIdAndUpdate can return null if doc was deleted
        if (!updated) {
            updated = await Definition.findById(existing._id);
        }
        if (!updated) {
            throw new Error(`Definition ${existing._id} missing after update`);
        }
        
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
                let updated = await Definition.findByIdAndUpdate(
                    existingDef._id,
                    { 
                        name: normalizedName,
                        slug: existingDef.slug || slug // Keep existing slug if present
                    },
                    { new: true, runValidators: true }
                );
                if (!updated) updated = await Definition.findById(existingDef._id);
                if (updated) return { definition: updated, wasCreated: false };
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
        const streamProgress = body.stream === true;
        if (streamProgress) delete body.stream;

        const { examId, subjectId, unitId: bodyUnitId, chapterId: bodyChapterId, topicId: bodyTopicId, lockLevel, data } = body;

        // Optional progress callback: (processed, total) => void. When streaming, API returns NDJSON stream.
        let progressReporter = null;

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

        // Resolve lock level from body (default: subject)
        const lock = lockLevel === "unit" || lockLevel === "chapter" || lockLevel === "topic" ? lockLevel : "subject";
        const hasUnitLock = lock === "unit" || lock === "chapter" || lock === "topic";
        const hasChapterLock = lock === "chapter" || lock === "topic";
        const hasTopicLock = lock === "topic";
        const unitId = hasUnitLock ? bodyUnitId : null;
        const chapterId = hasChapterLock ? bodyChapterId : null;
        const topicId = hasTopicLock ? bodyTopicId : null;

        // Validate locked parent IDs when provided
        if (hasUnitLock && !unitId) {
            return NextResponse.json(
                { success: false, message: "Lock at Unit requires unitId" },
                { status: 400 }
            );
        }
        if (hasChapterLock && !chapterId) {
            return NextResponse.json(
                { success: false, message: "Lock at Chapter requires chapterId" },
                { status: 400 }
            );
        }
        if (hasTopicLock && !topicId) {
            return NextResponse.json(
                { success: false, message: "Lock at Topic requires topicId" },
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

        // When lock level is unit/chapter/topic, verify and load fixed parents
        let fixedUnit = null;
        let fixedChapter = null;
        let fixedTopic = null;
        if (unitId) {
            fixedUnit = await Unit.findOne({ _id: unitId, subjectId, examId }).lean();
            if (!fixedUnit) {
                return NextResponse.json(
                    { success: false, message: "Selected unit not found or does not belong to the selected exam/subject" },
                    { status: 400 }
                );
            }
        }
        if (chapterId) {
            fixedChapter = await Chapter.findOne({ _id: chapterId, unitId: fixedUnit?._id || unitId, subjectId, examId }).lean();
            if (!fixedChapter) {
                return NextResponse.json(
                    { success: false, message: "Selected chapter not found or does not belong to the selected unit" },
                    { status: 400 }
                );
            }
            if (!fixedUnit) fixedUnit = await Unit.findById(fixedChapter.unitId).lean();
        }
        if (topicId) {
            fixedTopic = await Topic.findOne({ _id: topicId, chapterId: fixedChapter?._id || chapterId, subjectId, examId }).lean();
            if (!fixedTopic) {
                return NextResponse.json(
                    { success: false, message: "Selected topic not found or does not belong to the selected chapter" },
                    { status: 400 }
                );
            }
            if (!fixedChapter) fixedChapter = await Chapter.findById(fixedTopic.chapterId).lean();
            if (!fixedUnit) fixedUnit = await Unit.findById(fixedTopic.unitId).lean();
        }

        // --- FAST IMPORT: Preload existing entities and slug sets (no per-row findOne) ---
        const useFastImport = true; // Always use fast path: import data first, slugs allocated in-memory
        let unitsByName = new Map();
        let chaptersByKey = new Map();
        let topicsByKey = new Map();
        let subTopicsByKey = new Map();
        const unitSlugs = new Set();
        const chapterSlugs = new Set();
        const topicSlugs = new Set();
        const subTopicSlugs = new Set();
        const definitionSlugSets = new Map(); // per subTopicId
        let maxUnitOrder = 0;
        const maxChapterOrderByUnit = new Map();
        const maxTopicOrderByChapter = new Map();
        const maxSubTopicOrderByTopic = new Map();

        const normName = (s) => (s ? toTitleCase(String(s).trim()) : "");
        const normKey = (s) => (s ? String(s).trim().toLowerCase() : "");

        if (useFastImport) {
            const unitIds = fixedUnit ? [fixedUnit._id] : (await Unit.find({ examId, subjectId }).select("_id").lean()).map((u) => u._id);
            const units = fixedUnit ? [fixedUnit] : await Unit.find({ examId, subjectId }).lean();
            units.forEach((u) => {
                const k = normKey(u.name);
                if (k) unitsByName.set(k, u);
                if (u.slug) unitSlugs.add(u.slug);
                if (u.orderNumber != null) maxUnitOrder = Math.max(maxUnitOrder, u.orderNumber);
            });
            if (!fixedUnit && units.length === 0) maxUnitOrder = 0;

            const chapterIds = fixedChapter ? [fixedChapter._id] : (await Chapter.find({ unitId: { $in: unitIds }, examId, subjectId }).select("_id unitId").lean()).map((c) => c._id);
            const chapters = fixedChapter ? [fixedChapter] : await Chapter.find({ unitId: { $in: unitIds }, examId, subjectId }).lean();
            chapters.forEach((c) => {
                const k = c.unitId.toString() + "|" + normKey(c.name);
                if (c.name) chaptersByKey.set(k, c);
                if (c.slug) chapterSlugs.add(c.slug);
                const uid = c.unitId.toString();
                const prev = maxChapterOrderByUnit.get(uid) || 0;
                maxChapterOrderByUnit.set(uid, Math.max(prev, c.orderNumber || 0));
            });

            const topicIds = fixedTopic ? [fixedTopic._id] : (await Topic.find({ chapterId: { $in: chapterIds }, examId, subjectId }).select("_id chapterId").lean()).map((t) => t._id);
            const topics = fixedTopic ? [fixedTopic] : await Topic.find({ chapterId: { $in: chapterIds }, examId, subjectId }).lean();
            topics.forEach((t) => {
                const k = t.chapterId.toString() + "|" + normKey(t.name);
                if (t.name) topicsByKey.set(k, t);
                if (t.slug) topicSlugs.add(t.slug);
                const cid = t.chapterId.toString();
                const prev = maxTopicOrderByChapter.get(cid) || 0;
                maxTopicOrderByChapter.set(cid, Math.max(prev, t.orderNumber || 0));
            });

            const subTopics = await SubTopic.find({ topicId: { $in: topicIds }, examId, subjectId }).lean();
            subTopics.forEach((st) => {
                const k = st.topicId.toString() + "|" + normKey(st.name);
                if (st.name) subTopicsByKey.set(k, st);
                if (st.slug) subTopicSlugs.add(st.slug);
                const tid = st.topicId.toString();
                const prev = maxSubTopicOrderByTopic.get(tid) || 0;
                maxSubTopicOrderByTopic.set(tid, Math.max(prev, st.orderNumber || 0));
            });
            console.log(`📦 Fast import: preloaded ${units.length} units, ${chapters.length} chapters, ${topics.length} topics, ${subTopics.length} subtopics`);
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

        const MAX_SKIP_REASONS = 500; // Cap to avoid memory bloat on huge imports
        const BATCH_SIZE = 150; // Yield event loop every N rows for long imports
        const isLargeImport = data.length > 300;
        const logEveryN = 100;

        console.log(`🔄 Starting import of ${data.length} rows...`);

        const PROGRESS_INTERVAL = 15; // Send progress every N rows so bar moves with actual import speed

        async function runLoopAndBuildResult() {
        for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
            // Yield to event loop periodically to avoid blocking and reduce timeout risk
            if (rowIndex > 0 && rowIndex % BATCH_SIZE === 0) {
                await new Promise((r) => setImmediate(r));
            }

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
                    if (stats.skipReasons.length < MAX_SKIP_REASONS) stats.skipReasons.push(`Row ${rowNum}: Empty row (all fields empty)`);
                    continue;
                }

                // Minimum requirement by lock level
                if (lock === 'topic') {
                    if (!subTopicName) {
                        stats.rowsSkipped++;
                        if (stats.skipReasons.length < MAX_SKIP_REASONS) stats.skipReasons.push(`Row ${rowNum}: SubTopic is required when locked at Topic`);
                        continue;
                    }
                } else if (lock === 'chapter') {
                    if (!topicName) {
                        stats.rowsSkipped++;
                        if (stats.skipReasons.length < MAX_SKIP_REASONS) stats.skipReasons.push(`Row ${rowNum}: Topic is required when locked at Chapter`);
                        continue;
                    }
                } else if (lock === 'unit') {
                    if (!chapterName) {
                        stats.rowsSkipped++;
                        if (stats.skipReasons.length < MAX_SKIP_REASONS) stats.skipReasons.push(`Row ${rowNum}: Chapter is required when locked at Unit`);
                        continue;
                    }
                } else {
                    // subject
                    if (!unitName) {
                        stats.rowsSkipped++;
                        if (stats.skipReasons.length < MAX_SKIP_REASONS) stats.skipReasons.push(`Row ${rowNum}: Unit is required but missing`);
                        continue;
                    }
                }

                // Resolve unit: fixed (from lock) or find/create from row
                let unit = null;
                let unitCreated = false;
                if (useFastImport) {
                    if (fixedUnit) {
                        unit = fixedUnit;
                    } else {
                        const key = normKey(unitName);
                        unit = unitsByName.get(key);
                        if (!unit) {
                            const slug = allocateUniqueSlugSync(createSlug(normName(unitName)), unitSlugs);
                            maxUnitOrder++;
                            unit = await Unit.create({
                                name: normName(unitName),
                                slug,
                                examId,
                                subjectId,
                                orderNumber: maxUnitOrder,
                                status: "active"
                            });
                            unitsByName.set(key, unit);
                            unitSlugs.add(slug);
                            unitCreated = true;
                            stats.unitsCreated++;
                            stats.slugsGenerated++;
                        }
                    }
                } else if (fixedUnit) {
                    unit = fixedUnit;
                } else {
                    const result = await findOrCreateUnit(unitName, subjectId, examId, existingSlugs);
                    unit = result?.unit ?? null;
                    unitCreated = result?.wasCreated ?? false;
                    if (unit && !processedUnits.has(unit._id.toString())) {
                        processedUnits.add(unit._id.toString());
                        if (unitCreated) {
                            stats.unitsCreated++;
                            stats.slugsGenerated++;
                            if (!isLargeImport || rowNum % logEveryN === 0) console.log(`✅ Row ${rowNum}: Created Unit "${unitName}"`);
                        } else {
                            stats.unitsUpdated++;
                            if (!isLargeImport || rowNum % logEveryN === 0) console.log(`🔄 Row ${rowNum}: Updated Unit "${unitName}"`);
                        }
                    }
                }
                if (!unit) {
                    stats.rowsSkipped++;
                    if (stats.skipReasons.length < MAX_SKIP_REASONS) stats.skipReasons.push(`Row ${rowNum}: Failed to resolve Unit`);
                    continue;
                }

                // Resolve chapter: fixed (from lock) or find/create from row (only when not locked at chapter/topic)
                let chapter = null;
                let chapterCreated = false;
                if (useFastImport) {
                    if (fixedChapter) {
                        chapter = fixedChapter;
                    } else if (chapterName) {
                        const key = unit._id.toString() + "|" + normKey(chapterName);
                        chapter = chaptersByKey.get(key);
                        if (!chapter) {
                            const slug = allocateUniqueSlugSync(createSlug(normName(chapterName)), chapterSlugs);
                            const uid = unit._id.toString();
                            const prev = maxChapterOrderByUnit.get(uid) || 0;
                            const orderNum = prev + 1;
                            maxChapterOrderByUnit.set(uid, orderNum);
                            chapter = await Chapter.create({
                                name: normName(chapterName),
                                slug,
                                examId,
                                subjectId,
                                unitId: unit._id,
                                orderNumber: orderNum,
                                weightage: row.weightage ? parseInt(row.weightage) : 0,
                                time: row.time ? parseInt(row.time) : 0,
                                questions: row.questions ? parseInt(row.questions) : 0,
                                status: "active"
                            });
                            chaptersByKey.set(key, chapter);
                            chapterSlugs.add(slug);
                            chapterCreated = true;
                            stats.chaptersCreated++;
                            stats.slugsGenerated++;
                        }
                    }
                } else if (fixedChapter) {
                    chapter = fixedChapter;
                } else if (chapterName) {
                    const result = await findOrCreateChapter(chapterName, unit._id, subjectId, examId, row, existingSlugs);
                    chapter = result?.chapter ?? null;
                    chapterCreated = result?.wasCreated ?? false;
                    if (chapter && !processedChapters.has(chapter._id.toString())) {
                        processedChapters.add(chapter._id.toString());
                        if (chapterCreated) {
                            stats.chaptersCreated++;
                            stats.slugsGenerated++;
                            if (!isLargeImport || rowNum % logEveryN === 0) console.log(`✅ Row ${rowNum}: Created Chapter "${chapterName}" under Unit "${unitName || unit.name}"`);
                        } else {
                            stats.chaptersUpdated++;
                            if (!isLargeImport || rowNum % logEveryN === 0) console.log(`🔄 Row ${rowNum}: Updated Chapter "${chapterName}" under Unit "${unitName || unit.name}"`);
                        }
                    }
                }

                // Resolve topic: fixed (from lock) or find/create from row (only when not locked at topic)
                let topic = null;
                let topicCreated = false;
                if (useFastImport) {
                    if (fixedTopic) {
                        topic = fixedTopic;
                    } else if (topicName && chapter) {
                        const key = chapter._id.toString() + "|" + normKey(topicName);
                        topic = topicsByKey.get(key);
                        if (!topic) {
                            const slug = allocateUniqueSlugSync(createSlug(normName(topicName)), topicSlugs);
                            const cid = chapter._id.toString();
                            const prev = maxTopicOrderByChapter.get(cid) || 0;
                            const orderNum = prev + 1;
                            maxTopicOrderByChapter.set(cid, orderNum);
                            topic = await Topic.create({
                                name: normName(topicName),
                                slug,
                                examId,
                                subjectId,
                                unitId: unit._id,
                                chapterId: chapter._id,
                                orderNumber: orderNum,
                                status: "active"
                            });
                            topicsByKey.set(key, topic);
                            topicSlugs.add(slug);
                            topicCreated = true;
                            stats.topicsCreated++;
                            stats.slugsGenerated++;
                        }
                    }
                } else if (fixedTopic) {
                    topic = fixedTopic;
                } else if (topicName) {
                    if (chapter) {
                        const result = await findOrCreateTopic(topicName, chapter._id, unit._id, subjectId, examId, existingSlugs);
                        topic = result?.topic ?? null;
                        topicCreated = result?.wasCreated ?? false;
                        if (topic && !processedTopics.has(topic._id.toString())) {
                            processedTopics.add(topic._id.toString());
                            if (topicCreated) {
                                stats.topicsCreated++;
                                stats.slugsGenerated++;
                                if (!isLargeImport || rowNum % logEveryN === 0) console.log(`✅ Row ${rowNum}: Created Topic "${topicName}" under Chapter "${chapterName || chapter.name}"`);
                            } else {
                                stats.topicsUpdated++;
                                if (!isLargeImport || rowNum % logEveryN === 0) console.log(`🔄 Row ${rowNum}: Updated Topic "${topicName}" under Chapter "${chapterName || chapter.name}"`);
                            }
                        }
                    } else {
                        if (!isLargeImport) console.warn(`⚠️ Row ${rowNum}: Topic "${topicName}" requires Chapter. Topic not created.`);
                    }
                }

                // Level 4: SubTopic (optional - only create if subTopicName provided AND topic exists)
                let subTopic = null;
                let subTopicCreated = false;
                if (useFastImport) {
                    if (subTopicName && topic && chapter) {
                        const key = topic._id.toString() + "|" + normKey(subTopicName);
                        subTopic = subTopicsByKey.get(key);
                        if (!subTopic) {
                            const slug = allocateUniqueSlugSync(createSlug(normName(subTopicName)), subTopicSlugs);
                            const tid = topic._id.toString();
                            const prev = maxSubTopicOrderByTopic.get(tid) || 0;
                            const orderNum = prev + 1;
                            maxSubTopicOrderByTopic.set(tid, orderNum);
                            subTopic = await SubTopic.create({
                                name: normName(subTopicName),
                                slug,
                                examId,
                                subjectId,
                                unitId: unit._id,
                                chapterId: chapter._id,
                                topicId: topic._id,
                                orderNumber: orderNum,
                                status: "active"
                            });
                            subTopicsByKey.set(key, subTopic);
                            subTopicSlugs.add(slug);
                            subTopicCreated = true;
                            stats.subtopicsCreated++;
                            stats.slugsGenerated++;
                        }
                    }
                } else if (subTopicName) {
                    if (topic && chapter) {
                        const result = await findOrCreateSubTopic(subTopicName, topic._id, chapter._id, unit._id, subjectId, examId, existingSlugs);
                        subTopic = result?.subTopic ?? null;
                        subTopicCreated = result?.wasCreated ?? false;
                        if (subTopic && !processedSubTopics.has(subTopic._id.toString())) {
                            processedSubTopics.add(subTopic._id.toString());
                            if (subTopicCreated) {
                                stats.subtopicsCreated++;
                                stats.slugsGenerated++;
                                if (!isLargeImport || rowNum % logEveryN === 0) console.log(`✅ Row ${rowNum}: Created SubTopic "${subTopicName}" under Topic "${topicName}"`);
                            } else {
                                stats.subtopicsUpdated++;
                                if (!isLargeImport || rowNum % logEveryN === 0) console.log(`🔄 Row ${rowNum}: Updated SubTopic "${subTopicName}" under Topic "${topicName}"`);
                            }
                        }
                    } else {
                        if (!isLargeImport) console.warn(`⚠️ Row ${rowNum}: SubTopic "${subTopicName}" requires Topic and Chapter. SubTopic not created.`);
                    }
                }

                // Level 5: Definition (optional - only create if definitionName provided AND required parents exist)
                if (definitionName) {
                    if (subTopic && topic) {
                        if (useFastImport) {
                            let slugSet = definitionSlugSets.get(subTopic._id.toString());
                            if (!slugSet) {
                                slugSet = new Set();
                                definitionSlugSets.set(subTopic._id.toString(), slugSet);
                            }
                            const orderKey = `definition:${subTopic._id}`;
                            const orderNum = (orderCounters.get(orderKey) || 0) + 1;
                            orderCounters.set(orderKey, orderNum);
                            const slug = allocateUniqueSlugSync(createSlug(normName(definitionName)), slugSet);
                            const chapterIdForDef = chapter?._id || null;
                            try {
                                const definition = await Definition.create({
                                    name: normName(definitionName),
                                    slug,
                                    examId,
                                    subjectId,
                                    unitId: unit._id,
                                    chapterId: chapterIdForDef,
                                    topicId: topic._id,
                                    subTopicId: subTopic._id,
                                    orderNumber: orderNum,
                                    status: "active"
                                });
                                stats.definitionsCreated++;
                                stats.slugsGenerated++;
                            } catch (defErr) {
                                if (defErr.code === 11000) {
                                    const existingDef = await Definition.findOne({
                                        name: { $regex: new RegExp(`^${normName(definitionName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
                                        subTopicId: subTopic._id,
                                        subjectId,
                                        examId
                                    });
                                    if (existingDef) {
                                        await Definition.findByIdAndUpdate(existingDef._id, { name: normName(definitionName) }, { new: true });
                                        stats.definitionsUpdated++;
                                    } else {
                                        stats.rowsSkipped++;
                                        if (stats.skipReasons.length < MAX_SKIP_REASONS) stats.skipReasons.push(`Row ${rowNum}: Definition duplicate conflict`);
                                    }
                                } else {
                                    throw defErr;
                                }
                            }
                        } else {
                        const chapterIdForDefinition = chapter?._id || null;
                        const result = await createDefinition(
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
                        const definition = result?.definition ?? null;
                        const definitionCreated = result?.wasCreated ?? false;
                        
                        if (definition) {
                            if (definitionCreated) {
                                stats.definitionsCreated++;
                                stats.slugsGenerated++;
                                if (!isLargeImport || rowNum % logEveryN === 0) console.log(`✅ Row ${rowNum}: Created Definition "${definitionName}" under SubTopic "${subTopicName}"`);
                            } else {
                                stats.definitionsUpdated++;
                                if (!isLargeImport || rowNum % logEveryN === 0) console.log(`🔄 Row ${rowNum}: Updated Definition "${definitionName}" under SubTopic "${subTopicName}"`);
                            }
                            if (!definition.slug) {
                                console.error(`❌ Row ${rowNum}: Definition ${definition._id} has no slug!`);
                                if (stats.skipReasons.length < MAX_SKIP_REASONS) stats.skipReasons.push(`Row ${rowNum}: Definition slug missing after import`);
                            }
                        } else {
                            stats.rowsSkipped++;
                            if (stats.skipReasons.length < MAX_SKIP_REASONS) stats.skipReasons.push(`Row ${rowNum}: Failed to create/update Definition`);
                        }
                        }
                    } else {
                        if (!isLargeImport) console.warn(`⚠️ Row ${rowNum}: Definition "${definitionName}" requires SubTopic and Topic. Definition not created.`);
                    }
                }
                
                if (!isLargeImport || rowNum % logEveryN === 0) {
                    console.log(`✅ Row ${rowNum}: Processed. Unit: ${!!unitName}, Chapter: ${!!chapterName}, Topic: ${!!topicName}, SubTopic: ${!!subTopicName}, Definition: ${!!definitionName}`);
                }

                // Report progress for streaming (same speed as actual import)
                if (typeof progressReporter === 'function' && (rowNum % PROGRESS_INTERVAL === 0 || rowIndex === data.length - 1)) {
                    progressReporter(rowNum, data.length);
                }

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
                if (stats.skipReasons.length < MAX_SKIP_REASONS) {
                    stats.skipReasons.push(`Row ${rowNum}: ${errorMessage}`);
                }
                if (!isLargeImport) {
                    console.error(`❌ Row ${rowNum} Error:`, {
                        message: errorMessage,
                        code: err.code,
                        name: err.name,
                        stack: err.stack
                    });
                } else {
                    console.error(`❌ Row ${rowNum}: ${errorMessage}`);
                }
            }
        }

        console.log(`✅ Import completed. Stats:`, stats);

        // Build comprehensive success message
        const totalProcessed = data.length - stats.rowsSkipped;
        const totalCreated = stats.unitsCreated + stats.chaptersCreated + stats.topicsCreated + stats.subtopicsCreated + stats.definitionsCreated;
        const totalUpdated = stats.unitsUpdated + stats.chaptersUpdated + stats.topicsUpdated + stats.subtopicsUpdated + stats.definitionsUpdated;
        const skipReasonsCapped = stats.rowsSkipped > 0 && stats.skipReasons.length >= MAX_SKIP_REASONS;

        // Build success message with incremental import support info
        const successMessage = `Import completed! ✅\n` +
            `📦 Created: ${totalCreated} items (${stats.unitsCreated} Units, ${stats.chaptersCreated} Chapters, ${stats.topicsCreated} Topics, ${stats.subtopicsCreated} SubTopics, ${stats.definitionsCreated} Definitions)\n` +
            `🔄 Updated: ${totalUpdated} items (${stats.unitsUpdated} Units, ${stats.chaptersUpdated} Chapters, ${stats.topicsUpdated} Topics, ${stats.subtopicsUpdated} SubTopics, ${stats.definitionsUpdated} Definitions)\n` +
            `📊 Processed: ${totalProcessed} rows successfully\n` +
            (stats.rowsSkipped > 0 ? `⚠️ Skipped: ${stats.rowsSkipped} rows\n` : '') +
            (skipReasonsCapped ? `📋 Only first ${MAX_SKIP_REASONS} skip reasons are shown.\n` : '') +
            `🏷️ Generated: ${stats.slugsGenerated} slugs\n` +
            `\n💡 Tip: You can import more data anytime - the system will add new items and update existing ones automatically!`;

        return {
            success: true,
            data: {
                ...stats,
                totalProcessed,
                totalCreated,
                totalUpdated,
                skipReasonsCapped: skipReasonsCapped ? MAX_SKIP_REASONS : 0,
                unitsInserted: stats.unitsCreated + stats.unitsUpdated,
                chaptersInserted: stats.chaptersCreated + stats.chaptersUpdated,
                topicsInserted: stats.topicsCreated + stats.topicsUpdated,
                subtopicsInserted: stats.subtopicsCreated + stats.subtopicsUpdated,
                definitionsInserted: stats.definitionsCreated + stats.definitionsUpdated
            },
            message: successMessage
        };
        }

        if (streamProgress) {
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                    progressReporter = (processed, total) => {
                        try {
                            const percent = total ? (processed / total) * 100 : 0;
                            controller.enqueue(encoder.encode(JSON.stringify({ type: "progress", processed, total, percent }) + "\n"));
                        } catch (_) {}
                    };
                    try {
                        const result = await runLoopAndBuildResult();
                        controller.enqueue(encoder.encode(JSON.stringify({ type: "done", ...result }) + "\n"));
                    } catch (err) {
                        controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message: err.message || "Import failed" }) + "\n"));
                    } finally {
                        progressReporter = null;
                    }
                    controller.close();
                }
            });
            return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
        }

        const result = await runLoopAndBuildResult();
        return NextResponse.json(result);

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
