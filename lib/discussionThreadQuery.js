/**
 * Build MongoDB query for a thread by slug + hierarchy.
 * Slug is unique per hierarchy level (exam, subject, unit, chapter, topic, subtopic, definition).
 */
export function buildThreadQuery(slug, searchParams) {
    if (typeof searchParams.get !== "function") {
        return { slug };
    }
    return {
        slug,
        examId: searchParams.get("examId") || null,
        subjectId: searchParams.get("subjectId") || null,
        unitId: searchParams.get("unitId") || null,
        chapterId: searchParams.get("chapterId") || null,
        topicId: searchParams.get("topicId") || null,
        subTopicId: searchParams.get("subTopicId") || null,
        definitionId: searchParams.get("definitionId") || null,
    };
}

/** Build URL query string from thread hierarchy (for admin links and API calls). */
export function getThreadHierarchyQueryString(thread) {
    if (!thread) return "";
    const p = new URLSearchParams();
    const examId = thread.examId?._id ?? thread.examId;
    const subjectId = thread.subjectId?._id ?? thread.subjectId;
    const unitId = thread.unitId?._id ?? thread.unitId;
    const chapterId = thread.chapterId?._id ?? thread.chapterId;
    const topicId = thread.topicId?._id ?? thread.topicId;
    const subTopicId = thread.subTopicId?._id ?? thread.subTopicId;
    const definitionId = thread.definitionId?._id ?? thread.definitionId;
    if (examId) p.set("examId", String(examId));
    if (subjectId) p.set("subjectId", String(subjectId));
    if (unitId) p.set("unitId", String(unitId));
    if (chapterId) p.set("chapterId", String(chapterId));
    if (topicId) p.set("topicId", String(topicId));
    if (subTopicId) p.set("subTopicId", String(subTopicId));
    if (definitionId) p.set("definitionId", String(definitionId));
    return p.toString();
}
