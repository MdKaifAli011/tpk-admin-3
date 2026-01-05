import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Definition from "@/models/Definition";
import DefinitionDetails from "@/models/DefinitionDetails";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import { requireAction } from "@/middleware/authMiddleware";
import mongoose from "mongoose";

export async function POST(request) {
    try {
        // 1. Auth Check
        const authCheck = await requireAction(request, "POST"); // Re-using POST restriction or stricter?
        if (authCheck.error) {
            return NextResponse.json(authCheck, { status: authCheck.status || 401 });
        }

        await connectDB();
        const { examId, subjectId } = await request.json();

        if (!examId || !subjectId) {
            return NextResponse.json(
                { success: false, message: "Exam and Subject are required for export" },
                { status: 400 }
            );
        }

        // 2. Fetch Data using Aggregation for Performance
        const pipeline = [
            {
                $match: {
                    examId: new mongoose.Types.ObjectId(examId),
                    subjectId: new mongoose.Types.ObjectId(subjectId)
                }
            },
            // Lookup Hierarchy
            {
                $lookup: {
                    from: "units",
                    localField: "unitId",
                    foreignField: "_id",
                    as: "unit"
                }
            },
            { $unwind: "$unit" },
            {
                $lookup: {
                    from: "chapters",
                    localField: "chapterId",
                    foreignField: "_id",
                    as: "chapter"
                }
            },
            { $unwind: "$chapter" },
            {
                $lookup: {
                    from: "topics",
                    localField: "topicId",
                    foreignField: "_id",
                    as: "topic"
                }
            },
            { $unwind: "$topic" },
            {
                $lookup: {
                    from: "subtopics",
                    localField: "subTopicId",
                    foreignField: "_id",
                    as: "subtopic"
                }
            },
            { $unwind: "$subtopic" },
            // Lookup Content
            {
                $lookup: {
                    from: "definitiondetails",
                    localField: "_id",
                    foreignField: "definitionId",
                    as: "details"
                }
            },
            {
                $addFields: {
                    content: { $arrayElemAt: ["$details.content", 0] }
                }
            },
            // Sort by order 
            { $sort: { "unit.orderNumber": 1, "chapter.orderNumber": 1, "topic.orderNumber": 1, "subtopic.orderNumber": 1, "orderNumber": 1 } },
            // Project final fields
            {
                $project: {
                    unit: "$unit.name",
                    chapter: "$chapter.name",
                    topic: "$topic.name",
                    subtopic: "$subtopic.name",
                    definition: "$name",
                    content: "$content"
                }
            }
        ];

        const data = await Definition.aggregate(pipeline);

        if (!data || data.length === 0) {
            return NextResponse.json(
                { success: false, message: "No data found for the selected criteria" },
                { status: 404 }
            );
        }

        // 3. Generate CSV
        const headers = ["Unit", "Chapter", "Topic", "SubTopic", "Definition", "Content"];

        // CSV Escaping Helper
        const escapeCSV = (str) => {
            if (!str) return "";
            const stringValue = String(str);
            if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        const csvRows = data.map(row => {
            return [
                escapeCSV(row.unit),
                escapeCSV(row.chapter),
                escapeCSV(row.topic),
                escapeCSV(row.subtopic),
                escapeCSV(row.definition),
                escapeCSV(row.content || "")
            ].join(",");
        });

        const csvString = headers.join(",") + "\n" + csvRows.join("\n");

        return NextResponse.json({
            success: true,
            data: csvString,
            count: data.length
        });

    } catch (error) {
        console.error("Export Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Export failed" },
            { status: 500 }
        );
    }
}
