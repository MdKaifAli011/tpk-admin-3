import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import DefinitionDetails from "@/models/DefinitionDetails";
import { requireAction } from "@/middleware/authMiddleware";
import {
    findOrCreateUnit,
    findOrCreateChapter,
    findOrCreateTopic,
    findOrCreateSubTopic,
    createDefinition,
} from "@/lib/bulkImportHelpers";

export const maxDuration = 300;

/**
 * Book JSON Import API
 * Accepts nested structure: data.units[].chapters[].topics[].subtopics[] with definition + definition_content.
 * Creates Unit → Chapter → Topic → SubTopic → Definition and saves definition_content in DefinitionDetails.
 */
export async function POST(request) {
    try {
        const authCheck = await requireAction(request, "POST");
        if (authCheck.error) {
            return NextResponse.json(authCheck, { status: authCheck.status || 401 });
        }

        await connectDB();
        const body = await request.json();
        const { examId, subjectId, data } = body;

        if (!examId || !subjectId) {
            return NextResponse.json(
                { success: false, message: "Exam and Subject are required" },
                { status: 400 }
            );
        }

        if (!data || typeof data !== "object") {
            return NextResponse.json(
                { success: false, message: "Data object is required" },
                { status: 400 }
            );
        }

        const units = data.units;
        if (!Array.isArray(units) || units.length === 0) {
            return NextResponse.json(
                { success: false, message: "data.units must be a non-empty array" },
                { status: 400 }
            );
        }

        const [exam, subject] = await Promise.all([
            Exam.findById(examId).select("name"),
            Subject.findById(subjectId).select("name examId"),
        ]);

        if (!exam) {
            return NextResponse.json({ success: false, message: "Exam not found" }, { status: 404 });
        }
        if (!subject) {
            return NextResponse.json({ success: false, message: "Subject not found" }, { status: 404 });
        }
        if (subject.examId.toString() !== examId) {
            return NextResponse.json(
                { success: false, message: "Subject does not belong to the selected exam" },
                { status: 400 }
            );
        }

        const stats = {
            book_title: data.book_title || null,
            total_pages: data.total_pages ?? null,
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
            detailsUpdated: 0,
            errors: [],
        };

        const existingSlugs = [];
        const orderCounters = new Map();

        for (const unitRow of units) {
            const unitName = unitRow.units_name ?? unitRow.unit_name ?? unitRow.name;
            if (!unitName || !String(unitName).trim()) {
                stats.errors.push("Unit missing units_name");
                continue;
            }

            let unit;
            try {
                const result = await findOrCreateUnit(unitName, subjectId, examId, existingSlugs);
                unit = result.unit;
                if (result.wasCreated) stats.unitsCreated++;
                else stats.unitsUpdated++;
            } catch (err) {
                stats.errors.push(`Unit "${unitName}": ${err.message}`);
                continue;
            }

            const chapters = unitRow.chapters;
            if (!Array.isArray(chapters)) continue;

            for (const chapterRow of chapters) {
                const chapterName = chapterRow.name ?? chapterRow.chapter_name;
                if (!chapterName || !String(chapterName).trim()) {
                    stats.errors.push(`Chapter missing name under unit "${unitName}"`);
                    continue;
                }

                let chapter;
                try {
                    const result = await findOrCreateChapter(chapterName, unit._id, subjectId, examId, chapterRow, existingSlugs);
                    chapter = result.chapter;
                    if (result.wasCreated) stats.chaptersCreated++;
                    else stats.chaptersUpdated++;
                } catch (err) {
                    stats.errors.push(`Chapter "${chapterName}": ${err.message}`);
                    continue;
                }

                const topics = chapterRow.topics;
                if (!Array.isArray(topics)) continue;

                for (const topicRow of topics) {
                    const topicName = topicRow.name ?? topicRow.topic_name;
                    if (!topicName || !String(topicName).trim()) {
                        stats.errors.push(`Topic missing name under chapter "${chapterName}"`);
                        continue;
                    }

                    let topic;
                    try {
                        const result = await findOrCreateTopic(topicName, chapter._id, unit._id, subjectId, examId, existingSlugs);
                        topic = result.topic;
                        if (result.wasCreated) stats.topicsCreated++;
                        else stats.topicsUpdated++;
                    } catch (err) {
                        stats.errors.push(`Topic "${topicName}": ${err.message}`);
                        continue;
                    }

                    // One SubTopic per Topic (use topic name as subtopic name for "Content" container)
                    const subTopicName = topicRow.subtopic_name ?? topicName;
                    let subTopic;
                    try {
                        const result = await findOrCreateSubTopic(
                            subTopicName,
                            topic._id,
                            chapter._id,
                            unit._id,
                            subjectId,
                            examId,
                            existingSlugs
                        );
                        subTopic = result.subTopic;
                        if (result.wasCreated) stats.subtopicsCreated++;
                        else stats.subtopicsUpdated++;
                    } catch (err) {
                        stats.errors.push(`SubTopic "${subTopicName}": ${err.message}`);
                        continue;
                    }

                    const subtopics = topicRow.subtopics;
                    if (!Array.isArray(subtopics)) continue;

                    for (const defRow of subtopics) {
                        const defName = defRow.definition ?? defRow.name;
                        if (!defName || !String(defName).trim()) {
                            stats.errors.push("Definition missing 'definition' or 'name'");
                            continue;
                        }

                        try {
                            const { definition, wasCreated } = await createDefinition(
                                defName,
                                subTopic._id,
                                topic._id,
                                chapter._id,
                                unit._id,
                                subjectId,
                                examId,
                                existingSlugs,
                                orderCounters
                            );
                            if (wasCreated) stats.definitionsCreated++;
                            else stats.definitionsUpdated++;

                            const content = defRow.definition_content ?? defRow.content ?? "";
                            if (content && String(content).trim()) {
                                await DefinitionDetails.findOneAndUpdate(
                                    { definitionId: definition._id },
                                    {
                                        definitionId: definition._id,
                                        content: String(content).trim(),
                                        status: "publish",
                                    },
                                    { upsert: true, new: true }
                                );
                                stats.detailsUpdated++;
                            }
                        } catch (err) {
                            stats.errors.push(`Definition "${defName}": ${err.message}`);
                        }
                    }
                }
            }
        }

        const totalCreated =
            stats.unitsCreated +
            stats.chaptersCreated +
            stats.topicsCreated +
            stats.subtopicsCreated +
            stats.definitionsCreated;
        const totalUpdated =
            stats.unitsUpdated +
            stats.chaptersUpdated +
            stats.topicsUpdated +
            stats.subtopicsUpdated +
            stats.definitionsUpdated;

        return NextResponse.json({
            success: true,
            data: {
                ...stats,
                totalCreated,
                totalUpdated,
            },
            message: `Book import completed. Created: ${totalCreated}, Updated: ${totalUpdated}. Content saved for ${stats.detailsUpdated} definitions.`,
        });
    } catch (error) {
        console.error("Book JSON Import Error:", error);
        return NextResponse.json(
            {
                success: false,
                message: error.message || "Book import failed",
            },
            { status: 500 }
        );
    }
}
