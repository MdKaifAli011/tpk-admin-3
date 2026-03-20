/**
 * Discussion list fallback: current → parent → first child → same-branch (exam).
 * Single API response; all queries use request hierarchy only (same branch).
 *
 * Summary table:
 * | Page     | 1) Current    | 2) Else: Parent              | 3) Else (children)        | 4) Else: Same branch      |
 * |----------|----------------|------------------------------|---------------------------|----------------------------|
 * | Exam     | Exam threads   | (no parent)                  | First subject with threads| —                          |
 * | Subject  | Subject threads| Exam threads                 | First unit with threads   | Other threads in this exam|
 * | Unit     | Unit threads   | Subject threads              | First chapter with threads| Other threads in this exam|
 * | Chapter  | Chapter threads| Same unit threads            | First topic with threads  | Other threads in this exam|
 * | Topic    | Topic threads  | Same chapter threads         | First subtopic with threads | Other threads in this exam|
 * | Subtopic | Subtopic threads | Same topic threads        | First definition with threads | Other threads in this exam|
 * | Definition | Definition threads | Subtopic threads      | (no children)             | Other threads in this exam|
 *
 * Step 4 (same_branch) is applied in the API route when 1–3 return no threads: show threads from the same exam so the page is never blank.
 * Scoping: Unit1 threads only on Unit1 and its children; never on Unit2. Chapter1 threads only on Chapter1 and its children; never on Chapter2 or other units.
 */
const LEVELS = ["exam", "subject", "unit", "chapter", "topic", "subtopic", "definition"];

const LEVEL_TO_KEY = {
    exam: "examId",
    subject: "subjectId",
    unit: "unitId",
    chapter: "chapterId",
    topic: "topicId",
    subtopic: "subTopicId",
    definition: "definitionId",
};

export function getCurrentLevel(searchParams) {
    const ids = {
        examId: searchParams.get("examId") || null,
        subjectId: searchParams.get("subjectId") || null,
        unitId: searchParams.get("unitId") || null,
        chapterId: searchParams.get("chapterId") || null,
        topicId: searchParams.get("topicId") || null,
        subTopicId: searchParams.get("subTopicId") || null,
        definitionId: searchParams.get("definitionId") || null,
    };
    let level = "exam";
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        const key = LEVEL_TO_KEY[LEVELS[i]];
        if (ids[key]) {
            level = LEVELS[i];
            break;
        }
    }
    return { level, ids };
}

/** Threads at exactly this level; path from request so same unit/chapter only. */
export function buildThreadQueryAtLevel(level, ids) {
    const idx = LEVELS.indexOf(level);
    if (idx < 0) return {};
    const query = {};
    for (let i = 0; i <= idx; i++) {
        const k = LEVEL_TO_KEY[LEVELS[i]];
        query[k] = ids[k] || null;
    }
    for (let i = idx + 1; i < LEVELS.length; i++) {
        const k = LEVEL_TO_KEY[LEVELS[i]];
        query[k] = null;
    }
    return query;
}

export function getParentLevel(level) {
    const idx = LEVELS.indexOf(level);
    if (idx <= 0) return null;
    return LEVELS[idx - 1];
}

/** Parent = same branch only (e.g. chapter's parent = unit that contains this chapter). */
export function getParentIds(level, ids) {
    const parent = getParentLevel(level);
    if (!parent) return null;
    const parentIds = { ...ids };
    parentIds[LEVEL_TO_KEY[level]] = null;
    return parentIds;
}
