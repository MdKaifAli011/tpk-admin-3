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

// Hierarchy definitions
const HIERARCHY = [
    { level: "exam", model: Exam, parentField: null },
    { level: "subject", model: Subject, parentField: "examId" },
    { level: "unit", model: Unit, parentField: "subjectId" },
    { level: "chapter", model: Chapter, parentField: "unitId" },
    { level: "topic", model: Topic, parentField: "chapterId" },
    { level: "subtopic", model: SubTopic, parentField: "topicId" },
    { level: "definition", model: Definition, parentField: "subTopicId" },
];

// Helper to normalize header keys
const normalizeKey = (key) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

// Increase max duration for bulk imports (5 minutes = 300 seconds)
// This allows the API route to run longer than the default timeout
export const maxDuration = 300; // 5 minutes in seconds

export async function POST(request) {
    try {
        // 1. Auth Check
        const authCheck = await requireAction(request, "POST");
        if (authCheck.error) {
            return NextResponse.json(authCheck, { status: authCheck.status || 401 });
        }

        await connectDB();
        const body = await request.json();
        const { parents, data } = body;

        if (!data || !Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ success: false, message: "No data provided" }, { status: 400 });
        }

        // 2. Determine Start Level
        let startIndex = 0;
        const parentIds = { ...parents };

        for (let i = 0; i < HIERARCHY.length; i++) {
            const levelName = HIERARCHY[i].level;
            const idKey = `${levelName}Id`;
            if (!parentIds[idKey]) {
                startIndex = i;
                break;
            }
        }

        // 3. Sequential Processing with caching
        const contextCache = new Map();
        const orderCounters = new Map();

        let successCount = 0;
        let failCount = 0;
        let totalCreated = 0;
        let totalUpdated = 0;
        let slugsGenerated = 0;
        const errors = [];
        
        console.log(`🔄 Starting hierarchical import of ${data.length} rows from level: ${HIERARCHY[startIndex].level}...`);

        // Import title case utility
        const { toTitleCase } = await import("@/utils/titleCase");

        for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
            const row = data[rowIndex];
            const currentChain = { ...parentIds };

            try {
                // Iterate from Start Level down to Definition
                for (let i = startIndex; i < HIERARCHY.length; i++) {
                    const { level, model, parentField } = HIERARCHY[i];

                    // Find the column for this level
                    const rowKey = Object.keys(row).find(k => normalizeKey(k) === level || normalizeKey(k).includes(level));
                    const rawName = row[rowKey]?.trim();

                    // If name is missing, stop processing this branch
                    if (!rawName) break;

                    // Apply title case
                    const name = toTitleCase(rawName);

                    // Resolve Parent ID
                    let parentId = null;
                    if (parentField) {
                        parentId = currentChain[parentField];
                        if (!parentId) {
                            throw new Error(`Missing parent (${parentField}) for ${level} '${name}'`);
                        }
                    }

                    // Check Cache
                    const cacheKey = `${level}:${parentId || 'root'}:${name.toLowerCase()}`;
                    let entity = contextCache.get(cacheKey);

                    if (!entity) {
                        // DB Lookup
                        const query = { name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } };
                        if (parentId) query[parentField] = parentId;

                        let doc = await model.findOne(query);

                        // Generate slug (will be used for both create and update)
                        const baseSlug = createSlug(name);
                        
                        // Check if slug exists for uniqueness
                        const checkSlugExists = async (slug, excludeId) => {
                            const query = { slug };
                            if (parentField && parentId) {
                                query[parentField] = parentId;
                            }
                            if (excludeId) {
                                query._id = { $ne: excludeId };
                            }
                            const existing = await model.findOne(query);
                            return !!existing;
                        };
                        
                        const uniqueSlug = await generateUniqueSlug(
                            baseSlug,
                            checkSlugExists,
                            doc?._id || null
                        );

                        // Prepare Update/Create Payload Basics
                        const payloadBase = {
                            name,
                            slug: uniqueSlug, // Always set slug explicitly
                            status: "active",
                            ...currentChain
                        };

                        // Special fields for Chapter
                        if (level === 'chapter') {
                            const weightageKey = Object.keys(row).find(k => normalizeKey(k) === 'weightage');
                            const timeKey = Object.keys(row).find(k => normalizeKey(k) === 'time');
                            const questionsKey = Object.keys(row).find(k => normalizeKey(k) === 'questions');

                            if (weightageKey && row[weightageKey] !== undefined) payloadBase.weightage = parseInt(row[weightageKey]) || 0;
                            if (timeKey && row[timeKey] !== undefined) payloadBase.time = parseInt(row[timeKey]) || 0;
                            if (questionsKey && row[questionsKey] !== undefined) payloadBase.questions = parseInt(row[questionsKey]) || 0;
                        }

                        let wasCreated = false;
                        
                        if (!doc) {
                            // --- CREATE NEW ENTITY ---
                            wasCreated = true;
                            totalCreated++;
                            slugsGenerated++;
                            
                            const orderKey = `${level}:${parentId || 'root'}`;
                            if (!orderCounters.has(orderKey)) {
                                const maxDoc = await model.findOne(parentId ? { [parentField]: parentId } : {})
                                    .sort({ orderNumber: -1 })
                                    .select("orderNumber");
                                orderCounters.set(orderKey, maxDoc?.orderNumber || 0);
                            }

                            const nextOrder = orderCounters.get(orderKey) + 1;
                            orderCounters.set(orderKey, nextOrder);

                            doc = await model.create({
                                ...payloadBase,
                                orderNumber: nextOrder
                            });

                            // Verify slug was saved
                            if (!doc.slug) {
                                console.warn(`⚠️ ${level} ${doc._id} created without slug, fixing...`);
                                doc.slug = uniqueSlug;
                                await doc.save();
                            } else {
                                console.log(`✅ Created ${level}: "${name}" with slug: "${doc.slug}"`);
                            }

                        } else {
                            // --- UPDATE/OVERRIDE EXISTING ENTITY ---
                            wasCreated = false;
                            totalUpdated++;
                            
                            // Check if name changed to determine if slug should be regenerated
                            const nameChanged = doc.name.toLowerCase() !== name.toLowerCase();
                            const finalSlug = (nameChanged || !doc.slug) ? uniqueSlug : doc.slug;
                            
                            if (nameChanged && !doc.slug) {
                                slugsGenerated++;
                            }
                            
                            // Update all fields, regenerate slug only if name changed or missing, but PRESERVE orderNumber
                            const updatePayload = {
                                ...payloadBase,
                                slug: finalSlug, // Only update slug if name changed or missing
                                orderNumber: doc.orderNumber // Preserve orderNumber
                            };
                            
                            doc = await model.findByIdAndUpdate(
                                doc._id,
                                { $set: updatePayload },
                                { new: true, runValidators: true }
                            );
                            
                            // Verify slug was updated correctly
                            if (!doc.slug || (nameChanged && doc.slug !== finalSlug)) {
                                console.warn(`⚠️ ${level} ${doc._id} slug not updated correctly, fixing...`);
                                doc.slug = finalSlug;
                                await doc.save();
                            }
                            
                            if (nameChanged) {
                                console.log(`🔄 Updated ${level}: "${doc.name}" → "${name}" (slug: "${doc.slug}")`);
                            } else {
                                console.log(`🔄 Updated ${level}: "${name}" (slug preserved: "${doc.slug}")`);
                            }
                        }

                        // Handle Definition Content (For both Create and Update)
                        if (level === 'definition') {
                            const contentKey = Object.keys(row).find(k => normalizeKey(k) === 'content' || normalizeKey(k) === 'definitioncontent');
                            const content = row[contentKey];
                            if (content && content.trim()) {
                                try {
                                    await DefinitionDetails.findOneAndUpdate(
                                        { definitionId: doc._id },
                                        {
                                            definitionId: doc._id,
                                            content: content.trim(),
                                            examId: currentChain.examId,
                                            subjectId: currentChain.subjectId,
                                            unitId: currentChain.unitId,
                                            chapterId: currentChain.chapterId,
                                            topicId: currentChain.topicId,
                                            subTopicId: currentChain.subTopicId
                                        },
                                        { upsert: true, new: true }
                                    );
                                } catch (detailErr) {
                                    console.error(`Failed to update/create DefinitionDetails for ${name}:`, detailErr);
                                }
                            }
                        }

                        entity = doc;
                        contextCache.set(cacheKey, entity);
                    }

                    // Update Chain for next level
                    currentChain[`${level}Id`] = entity._id;
                }

                successCount++;

            } catch (err) {
                console.error(`Row ${rowIndex + 1} Error:`, err);
                failCount++;
                errors.push(`Row ${rowIndex + 1}: ${err.message}`);
            }
        }

        console.log(`✅ Hierarchical import completed. Created: ${totalCreated}, Updated: ${totalUpdated}, Success: ${successCount}, Failed: ${failCount}, Slugs: ${slugsGenerated}`);
        
        return NextResponse.json({
            success: true,
            data: { 
                successCount, 
                failCount, 
                errors,
                totalCreated,
                totalUpdated,
                slugsGenerated
            },
            message: `Import completed! Created: ${totalCreated} items, Updated: ${totalUpdated} items. ${failCount} rows failed. ${slugsGenerated} slugs generated.`
        });

    } catch (error) {
        console.error("Hierarchical Import Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
