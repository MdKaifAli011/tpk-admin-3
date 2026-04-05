/**
 * Shared helpers for bulk import (context-locked and book-json).
 * Used by: context-locked route, book-json route.
 */
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
import { createSlug, generateUniqueSlug } from "@/utils/serverSlug";
import { regexExactInsensitive } from "@/utils/escapeRegex.js";

export const toTitleCase = (str) => {
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

export async function findOrCreateUnit(name, subjectId, examId, existingSlugs) {
    const normalizedName = toTitleCase(name.trim());
    let unit = await Unit.findOne({
        name: { $regex: regexExactInsensitive(normalizedName) },
        subjectId,
        examId
    });
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
        const maxOrder = await Unit.findOne({ subjectId, examId }).sort({ orderNumber: -1 }).select('orderNumber').lean();
        const nextOrderNumber = (maxOrder?.orderNumber || 0) + 1;
        try {
            unit = await Unit.create({
                name: normalizedName, slug, examId, subjectId, orderNumber: nextOrderNumber, status: 'active'
            });
            return { unit, wasCreated: true };
        } catch (createErr) {
            if (createErr.code === 11000) {
                const existingBySlug = await Unit.findOne({ subjectId, examId, slug });
                if (existingBySlug) {
                    unit = await Unit.findByIdAndUpdate(existingBySlug._id, { name: normalizedName }, { new: true, runValidators: true });
                    return { unit, wasCreated: false };
                }
            }
            throw createErr;
        }
    }
    const nameChanged = unit.name.toLowerCase() !== normalizedName.toLowerCase();
    const finalSlug = (nameChanged || !unit.slug) ? slug : unit.slug;
    unit = await Unit.findByIdAndUpdate(unit._id, { name: normalizedName, slug: finalSlug }, { new: true, runValidators: true });
    if (!unit.slug) { unit.slug = slug; await unit.save(); }
    return { unit, wasCreated: false };
}

export async function findOrCreateChapter(name, unitId, subjectId, examId, rowData, existingSlugs) {
    const normalizedName = toTitleCase(name.trim());
    let chapter = await Chapter.findOne({
        name: { $regex: regexExactInsensitive(normalizedName) },
        unitId, subjectId, examId
    });
    const baseSlug = createSlug(normalizedName);
    const checkSlugExists = async (slug, excludeId) => {
        const query = { unitId, subjectId, examId, slug };
        if (excludeId) query._id = { $ne: excludeId };
        const existing = await Chapter.findOne(query);
        return !!existing || existingSlugs.includes(slug);
    };
    const slug = await generateUniqueSlug(baseSlug, checkSlugExists, chapter?._id || null);
    existingSlugs.push(slug);
    const row = rowData || {};
    if (!chapter) {
        const maxOrder = await Chapter.findOne({ unitId, subjectId, examId }).sort({ orderNumber: -1 }).select('orderNumber').lean();
        const nextOrderNumber = (maxOrder?.orderNumber || 0) + 1;
        try {
            chapter = await Chapter.create({
                name: normalizedName, slug, examId, subjectId, unitId, orderNumber: nextOrderNumber,
                weightage: row.weightage ? parseInt(row.weightage) : 0,
                time: row.time ? parseInt(row.time) : 0,
                questions: row.questions ? parseInt(row.questions) : 0,
                status: 'active'
            });
            return { chapter, wasCreated: true };
        } catch (createErr) {
            if (createErr.code === 11000) {
                const existingBySlug = await Chapter.findOne({ unitId, subjectId, examId, slug });
                if (existingBySlug) {
                    chapter = await Chapter.findByIdAndUpdate(existingBySlug._id, {
                        name: normalizedName,
                        weightage: row.weightage != null ? parseInt(row.weightage) : existingBySlug.weightage,
                        time: row.time != null ? parseInt(row.time) : existingBySlug.time,
                        questions: row.questions != null ? parseInt(row.questions) : existingBySlug.questions
                    }, { new: true, runValidators: true });
                    return { chapter, wasCreated: false };
                }
            }
            throw createErr;
        }
    }
    const nameChanged = chapter.name.toLowerCase() !== normalizedName.toLowerCase();
    const finalSlug = (nameChanged || !chapter.slug) ? slug : chapter.slug;
    const updatePayload = { name: normalizedName, slug: finalSlug };
    if (row.weightage !== undefined) updatePayload.weightage = parseInt(row.weightage) || 0;
    if (row.time !== undefined) updatePayload.time = parseInt(row.time) || 0;
    if (row.questions !== undefined) updatePayload.questions = parseInt(row.questions) || 0;
    chapter = await Chapter.findByIdAndUpdate(chapter._id, updatePayload, { new: true, runValidators: true });
    if (!chapter.slug) { chapter.slug = slug; await chapter.save(); }
    return { chapter, wasCreated: false };
}

export async function findOrCreateTopic(name, chapterId, unitId, subjectId, examId, existingSlugs) {
    const normalizedName = toTitleCase(name.trim());
    let topic = await Topic.findOne({
        name: { $regex: regexExactInsensitive(normalizedName) },
        chapterId, unitId, subjectId, examId
    });
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
        const maxOrder = await Topic.findOne({ chapterId, unitId, subjectId, examId }).sort({ orderNumber: -1 }).select('orderNumber').lean();
        const nextOrderNumber = (maxOrder?.orderNumber || 0) + 1;
        try {
            topic = await Topic.create({
                name: normalizedName, slug, examId, subjectId, unitId, chapterId, orderNumber: nextOrderNumber, status: 'active'
            });
            return { topic, wasCreated: true };
        } catch (createErr) {
            if (createErr.code === 11000) {
                const existingBySlug = await Topic.findOne({ chapterId, unitId, subjectId, examId, slug });
                if (existingBySlug) {
                    topic = await Topic.findByIdAndUpdate(existingBySlug._id, { name: normalizedName }, { new: true, runValidators: true });
                    return { topic, wasCreated: false };
                }
            }
            throw createErr;
        }
    }
    const nameChanged = topic.name.toLowerCase() !== normalizedName.toLowerCase();
    const finalSlug = (nameChanged || !topic.slug) ? slug : topic.slug;
    topic = await Topic.findByIdAndUpdate(topic._id, { name: normalizedName, slug: finalSlug }, { new: true, runValidators: true });
    if (!topic.slug) { topic.slug = slug; await topic.save(); }
    return { topic, wasCreated: false };
}

export async function findOrCreateSubTopic(name, topicId, chapterId, unitId, subjectId, examId, existingSlugs) {
    const normalizedName = toTitleCase(name.trim());
    let subTopic = await SubTopic.findOne({
        name: { $regex: regexExactInsensitive(normalizedName) },
        topicId, chapterId, unitId, subjectId, examId
    });
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
        const maxOrder = await SubTopic.findOne({ topicId, chapterId, unitId, subjectId, examId }).sort({ orderNumber: -1 }).select('orderNumber').lean();
        const nextOrderNumber = (maxOrder?.orderNumber || 0) + 1;
        try {
            subTopic = await SubTopic.create({
                name: normalizedName, slug, examId, subjectId, unitId, chapterId, topicId, orderNumber: nextOrderNumber, status: 'active'
            });
            return { subTopic, wasCreated: true };
        } catch (createErr) {
            if (createErr.code === 11000) {
                const existingBySlug = await SubTopic.findOne({ topicId, chapterId, unitId, subjectId, examId, slug });
                if (existingBySlug) {
                    subTopic = await SubTopic.findByIdAndUpdate(existingBySlug._id, { name: normalizedName }, { new: true, runValidators: true });
                    return { subTopic, wasCreated: false };
                }
            }
            throw createErr;
        }
    }
    const nameChanged = subTopic.name.toLowerCase() !== normalizedName.toLowerCase();
    const finalSlug = (nameChanged || !subTopic.slug) ? slug : subTopic.slug;
    subTopic = await SubTopic.findByIdAndUpdate(subTopic._id, { name: normalizedName, slug: finalSlug }, { new: true, runValidators: true });
    if (!subTopic.slug) { subTopic.slug = slug; await subTopic.save(); }
    return { subTopic, wasCreated: false };
}

export async function createDefinition(name, subTopicId, topicId, chapterId, unitId, subjectId, examId, existingSlugs, orderCounters) {
    const normalizedName = toTitleCase(name.trim());
    const duplicateQuery = {
        name: { $regex: regexExactInsensitive(normalizedName) },
        subTopicId, topicId, unitId, subjectId, examId
    };
    const existing = await Definition.findOne(duplicateQuery);
    const baseSlug = createSlug(normalizedName);
    const checkSlugExists = async (slug, excludeId) => {
        const query = { subTopicId, topicId, unitId, subjectId, examId, slug };
        if (excludeId) query._id = { $ne: excludeId };
        const existingDef = await Definition.findOne(query);
        return !!existingDef || existingSlugs.includes(slug);
    };
    const slug = await generateUniqueSlug(baseSlug, checkSlugExists, existing?._id || null);
    existingSlugs.push(slug);

    if (existing) {
        const nameChanged = existing.name.toLowerCase() !== normalizedName.toLowerCase();
        const finalSlug = (nameChanged || !existing.slug) ? slug : existing.slug;
        const updated = await Definition.findByIdAndUpdate(existing._id, { name: normalizedName, slug: finalSlug }, { new: true, runValidators: true });
        if (!updated.slug) { updated.slug = slug; await updated.save(); }
        return { definition: updated, wasCreated: false };
    }

    const orderKey = `definition:${subTopicId}`;
    const query = { subTopicId, topicId, unitId, subjectId, examId };
    if (chapterId) query.chapterId = chapterId;
    const maxDoc = await Definition.findOne(query).sort({ orderNumber: -1 }).select('orderNumber').lean();
    const dbMaxOrder = maxDoc?.orderNumber || 0;
    const cacheMaxOrder = orderCounters.get(orderKey) || 0;
    const nextOrder = Math.max(dbMaxOrder, cacheMaxOrder) + 1;
    orderCounters.set(orderKey, nextOrder);

    try {
        const definition = await Definition.create({
            name: normalizedName, slug, examId, subjectId, unitId, chapterId: chapterId || null, topicId, subTopicId, orderNumber: nextOrder, status: 'active'
        });
        if (!definition.slug) { definition.slug = slug; await definition.save(); }
        return { definition, wasCreated: true };
    } catch (createErr) {
        if (createErr.code === 11000) {
            const existingDef = await Definition.findOne(duplicateQuery);
            if (existingDef) {
                const updated = await Definition.findByIdAndUpdate(existingDef._id, { name: normalizedName, slug: existingDef.slug || slug }, { new: true, runValidators: true });
                return { definition: updated, wasCreated: false };
            }
            const maxDoc2 = await Definition.findOne({ subTopicId, topicId, unitId, subjectId, examId }).sort({ orderNumber: -1 }).select('orderNumber').lean();
            const altOrder = (maxDoc2?.orderNumber || 0) + 1;
            orderCounters.set(orderKey, altOrder);
            const definition = await Definition.create({
                name: normalizedName, slug, examId, subjectId, unitId, chapterId: chapterId || null, topicId, subTopicId, orderNumber: altOrder, status: 'active'
            });
            return { definition, wasCreated: true };
        }
        throw createErr;
    }
}
