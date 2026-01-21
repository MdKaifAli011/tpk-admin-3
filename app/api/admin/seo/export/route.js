import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import { requireAction } from "@/middleware/authMiddleware";

// Import all models and their details
import Exam from "@/models/Exam";
import ExamDetails from "@/models/ExamDetails";
import Subject from "@/models/Subject";
import SubjectDetails from "@/models/SubjectDetails";
import Unit from "@/models/Unit";
import UnitDetails from "@/models/UnitDetails";
import Chapter from "@/models/Chapter";
import ChapterDetails from "@/models/ChapterDetails";
import Topic from "@/models/Topic";
import TopicDetails from "@/models/TopicDetails";
import SubTopic from "@/models/SubTopic";
import SubTopicDetails from "@/models/SubTopicDetails";
import Definition from "@/models/Definition";
import DefinitionDetails from "@/models/DefinitionDetails";

const MODEL_MAP = {
    exam: { main: Exam, details: ExamDetails, refField: "examId" },
    subject: { main: Subject, details: SubjectDetails, refField: "subjectId" },
    unit: { main: Unit, details: UnitDetails, refField: "unitId" },
    chapter: { main: Chapter, details: ChapterDetails, refField: "chapterId" },
    topic: { main: Topic, details: TopicDetails, refField: "topicId" },
    subtopic: { main: SubTopic, details: SubTopicDetails, refField: "subTopicId" },
    definition: { main: Definition, details: DefinitionDetails, refField: "definitionId" },
};

export async function POST(request) {
    try {
        const authCheck = await requireAction(request, "POST");
        if (authCheck.error) {
            return NextResponse.json(authCheck, { status: authCheck.status || 401 });
        }

        await connectDB();
        const { type, filters } = await request.json();

        if (!type || !MODEL_MAP[type]) {
            return NextResponse.json({ success: false, message: "Invalid type" }, { status: 400 });
        }

        const { main, details, refField } = MODEL_MAP[type];

        // Build query for main entities
        const query = {};
        if (filters) {
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    query[key] = new mongoose.Types.ObjectId(filters[key]);
                }
            });
        }

        // Fetch main entities
        const entities = await main.find(query).sort({ orderNumber: 1 }).lean();

        if (!entities.length) {
            return NextResponse.json({ success: true, data: "", count: 0 });
        }

        // Fetch details for all entities
        const entityIds = entities.map(e => e._id);
        const allDetails = await details.find({ [refField]: { $in: entityIds } }).lean();

        const detailsMap = new Map(allDetails.map(d => [d[refField].toString(), d]));

        // CSV Headers
        const headers = ["ID", "Name", "OrderNumber", "SEO Title", "Meta Description", "Keywords", "Status"];

        const escapeCSV = (value) => {
            if (value === null || value === undefined) return "";
            const stringValue = String(value);
            const cleaned = stringValue.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
            if (cleaned.includes(",") || cleaned.includes('"') || cleaned.includes("\n") || cleaned.includes("\r")) {
                return `"${cleaned.replace(/"/g, '""')}"`;
            }
            return cleaned;
        };

        const csvRows = entities.map(entity => {
            const detail = detailsMap.get(entity._id.toString()) || {};
            return [
                entity._id.toString(),
                escapeCSV(entity.name),
                entity.orderNumber || "",
                escapeCSV(detail.title || ""),
                escapeCSV(detail.metaDescription || ""),
                escapeCSV(detail.keywords || ""),
                escapeCSV(detail.status || "draft")
            ].join(",");
        });

        const csvString = headers.join(",") + "\n" + csvRows.join("\n");

        return NextResponse.json({
            success: true,
            data: csvString,
            count: entities.length,
            type: type
        });

    } catch (error) {
        console.error("SEO Export Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
