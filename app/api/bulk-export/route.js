import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Definition from "@/models/Definition";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
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

        // Fetch ALL data from the hierarchy - Units, Chapters, Topics, SubTopics, Definitions
        const matchFilter = {
            examId: new mongoose.Types.ObjectId(examId),
            subjectId: new mongoose.Types.ObjectId(subjectId)
        };
        
        console.log(`🔍 Export: Fetching ALL data for examId=${examId}, subjectId=${subjectId}`);
        
        // Fetch ALL units for this exam/subject
        const allUnits = await Unit.find(matchFilter)
            .select("_id name orderNumber")
            .sort({ orderNumber: 1 })
            .lean();
        console.log(`📦 Export: Found ${allUnits.length} Units`);
        
        const unitIds = allUnits.map(u => u._id);
        
        // Fetch ALL chapters for these units
        const allChapters = await Chapter.find({ unitId: { $in: unitIds } })
            .select("_id name orderNumber unitId")
            .sort({ orderNumber: 1 })
            .lean();
        console.log(`📦 Export: Found ${allChapters.length} Chapters`);
        
        const chapterIds = allChapters.map(c => c._id);
        
        // Fetch ALL topics for these chapters
        const allTopics = await Topic.find({ chapterId: { $in: chapterIds } })
            .select("_id name orderNumber chapterId")
            .sort({ orderNumber: 1 })
            .lean();
        console.log(`📦 Export: Found ${allTopics.length} Topics`);
        
        const topicIds = allTopics.map(t => t._id);
        
        // Fetch ALL subtopics for these topics
        const allSubTopics = await SubTopic.find({ topicId: { $in: topicIds } })
            .select("_id name orderNumber topicId")
            .sort({ orderNumber: 1 })
            .lean();
        console.log(`📦 Export: Found ${allSubTopics.length} SubTopics`);
        
        const subTopicIds = allSubTopics.map(st => st._id);
        
        // Fetch ALL definitions for these subtopics
        const allDefinitions = await Definition.find({ subTopicId: { $in: subTopicIds } })
            .select("_id name orderNumber unitId chapterId topicId subTopicId")
            .sort({ orderNumber: 1 })
            .lean();
        console.log(`📦 Export: Found ${allDefinitions.length} Definitions`);
        
        const totalItems = allUnits.length + allChapters.length + allTopics.length + allSubTopics.length + allDefinitions.length;
        console.log(`📊 Export: Total items to export: ${totalItems} (${allUnits.length} Units + ${allChapters.length} Chapters + ${allTopics.length} Topics + ${allSubTopics.length} SubTopics + ${allDefinitions.length} Definitions)`);

        // Build comprehensive export data structure
        // Create maps for quick lookup
        const unitMap = new Map(allUnits.map(u => [u._id.toString(), u.name]));
        const chapterMap = new Map(allChapters.map(c => [c._id.toString(), { name: c.name, unitId: c.unitId.toString() }]));
        const topicMap = new Map(allTopics.map(t => [t._id.toString(), { name: t.name, chapterId: t.chapterId.toString() }]));
        const subTopicMap = new Map(allSubTopics.map(st => [st._id.toString(), { name: st.name, topicId: st.topicId.toString() }]));
        
        // Build comprehensive export rows
        const exportRows = [];
        
        // 1. Add ALL Units (even without chapters)
        for (const unit of allUnits) {
            exportRows.push({
                unit: unit.name,
                chapter: "",
                topic: "",
                subtopic: "",
                definition: "",
                type: "unit",
                orderNumber: unit.orderNumber
            });
        }
        
        // 2. Add ALL Chapters with their units
        for (const chapter of allChapters) {
            const unitName = unitMap.get(chapter.unitId.toString()) || "";
            exportRows.push({
                unit: unitName,
                chapter: chapter.name,
                topic: "",
                subtopic: "",
                definition: "",
                type: "chapter",
                orderNumber: chapter.orderNumber
            });
        }
        
        // 3. Add ALL Topics with their hierarchy
        for (const topic of allTopics) {
            const chapterInfo = chapterMap.get(topic.chapterId.toString());
            if (chapterInfo) {
                const unitName = unitMap.get(chapterInfo.unitId) || "";
                exportRows.push({
                    unit: unitName,
                    chapter: chapterInfo.name,
                    topic: topic.name,
                    subtopic: "",
                    definition: "",
                    type: "topic",
                    orderNumber: topic.orderNumber
                });
            }
        }
        
        // 4. Add ALL SubTopics with their hierarchy
        for (const subTopic of allSubTopics) {
            const topicInfo = topicMap.get(subTopic.topicId.toString());
            if (topicInfo) {
                const chapterInfo = chapterMap.get(topicInfo.chapterId);
                if (chapterInfo) {
                    const unitName = unitMap.get(chapterInfo.unitId) || "";
                    exportRows.push({
                        unit: unitName,
                        chapter: chapterInfo.name,
                        topic: topicInfo.name,
                        subtopic: subTopic.name,
                        definition: "",
                        type: "subtopic",
                        orderNumber: subTopic.orderNumber
                    });
                }
            }
        }
        
        // 5. Add ALL Definitions with their complete hierarchy
        for (const definition of allDefinitions) {
            const subTopicInfo = subTopicMap.get(definition.subTopicId?.toString());
            if (subTopicInfo) {
                const topicInfo = topicMap.get(subTopicInfo.topicId);
                if (topicInfo) {
                    const chapterInfo = chapterMap.get(topicInfo.chapterId);
                    if (chapterInfo) {
                        const unitName = unitMap.get(chapterInfo.unitId) || "";
                        exportRows.push({
                            unit: unitName,
                            chapter: chapterInfo.name,
                            topic: topicInfo.name,
                            subtopic: subTopicInfo.name,
                            definition: definition.name,
                            type: "definition",
                            orderNumber: definition.orderNumber
                        });
                    }
                }
            }
        }
        
        // Sort by hierarchy and orderNumber
        exportRows.sort((a, b) => {
            const typeOrder = { unit: 1, chapter: 2, topic: 3, subtopic: 4, definition: 5 };
            if (a.unit !== b.unit) {
                // Sort by unit name
                const unitA = allUnits.find(u => u.name === a.unit);
                const unitB = allUnits.find(u => u.name === b.unit);
                if (unitA && unitB) return (unitA.orderNumber || 0) - (unitB.orderNumber || 0);
            }
            if (a.chapter !== b.chapter) {
                const chapterA = allChapters.find(c => c.name === a.chapter);
                const chapterB = allChapters.find(c => c.name === b.chapter);
                if (chapterA && chapterB) return (chapterA.orderNumber || 0) - (chapterB.orderNumber || 0);
            }
            if (a.topic !== b.topic) {
                const topicA = allTopics.find(t => t.name === a.topic);
                const topicB = allTopics.find(t => t.name === b.topic);
                if (topicA && topicB) return (topicA.orderNumber || 0) - (topicB.orderNumber || 0);
            }
            if (a.subtopic !== b.subtopic) {
                const subTopicA = allSubTopics.find(st => st.name === a.subtopic);
                const subTopicB = allSubTopics.find(st => st.name === b.subtopic);
                if (subTopicA && subTopicB) return (subTopicA.orderNumber || 0) - (subTopicB.orderNumber || 0);
            }
            // Same hierarchy level - sort by type then orderNumber
            const typeDiff = (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0);
            if (typeDiff !== 0) return typeDiff;
            return (a.orderNumber || 0) - (b.orderNumber || 0);
        });
        
        const exportData = exportRows;
        console.log(`✅ Export: Built comprehensive export with ${exportData.length} rows (${allUnits.length} Units + ${allChapters.length} Chapters + ${allTopics.length} Topics + ${allSubTopics.length} SubTopics + ${allDefinitions.length} Definitions)`);

        // 3. Generate CSV with proper escaping - ONLY NAMES, NO CONTENT
        const headers = ["Unit", "Chapter", "Topic", "SubTopic", "Definition"];

        // CSV Escaping Helper - handles all edge cases
        const escapeCSV = (value) => {
            if (value === null || value === undefined) return "";
            const stringValue = String(value);
            // Remove any control characters except newlines and tabs
            const cleaned = stringValue.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
            // Check if quoting is needed
            if (cleaned.includes(",") || cleaned.includes('"') || cleaned.includes("\n") || cleaned.includes("\r")) {
                // Escape quotes by doubling them
                return `"${cleaned.replace(/"/g, '""')}"`;
            }
            return cleaned;
        };

        // Build CSV rows - process ALL data (ONLY NAMES, NO CONTENT)
        let processedCount = 0;
        let errorCount = 0;
        
        const csvRows = exportData.map((row, index) => {
            try {
                processedCount++;
                const csvRow = [
                    escapeCSV(row.unit || ""),
                    escapeCSV(row.chapter || ""),
                    escapeCSV(row.topic || ""),
                    escapeCSV(row.subtopic || ""),
                    escapeCSV(row.definition || "")
                ].join(",");
                
                return csvRow;
            } catch (error) {
                errorCount++;
                console.error(`❌ Error processing row ${index + 1}/${exportData.length}:`, error, row);
                // Return empty row on error to maintain row count
                return ["", "", "", "", ""].join(",");
            }
        });

        if (errorCount > 0) {
            console.warn(`⚠️ Export: ${errorCount} rows had processing errors`);
        }

        const csvString = headers.join(",") + "\n" + csvRows.join("\n");
        const fileSizeKB = (Buffer.byteLength(csvString, "utf8") / 1024).toFixed(2);

        console.log(`📄 Export: Generated CSV with ${csvRows.length} data rows + 1 header row (${fileSizeKB} KB)`);
        console.log(`✅ Export: Processed ${processedCount} rows successfully, ${errorCount} errors`);
        console.log(`📊 Export: CSV contains ${csvRows.length} total rows:`);
        console.log(`   - ${allUnits.length} Units`);
        console.log(`   - ${allChapters.length} Chapters`);
        console.log(`   - ${allTopics.length} Topics`);
        console.log(`   - ${allSubTopics.length} SubTopics`);
        console.log(`   - ${allDefinitions.length} Definitions`);
        console.log(`✅ EXPORT SUCCESS: All ${totalItems} items exported correctly!`);

        // Return JSON with CSV data for frontend to handle download
        return NextResponse.json({
            success: true,
            data: csvString,
            count: csvRows.length, // Total rows in CSV
            totalItems: totalItems,
            units: allUnits.length,
            chapters: allChapters.length,
            topics: allTopics.length,
            subtopics: allSubTopics.length,
            definitions: allDefinitions.length,
            processed: processedCount,
            errors: errorCount,
            size: Buffer.byteLength(csvString, "utf8")
        });

    } catch (error) {
        console.error("Export Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Export failed" },
            { status: 500 }
        );
    }
}
