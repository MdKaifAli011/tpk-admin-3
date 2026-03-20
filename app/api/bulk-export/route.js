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
        const body = await request.json();
        const { examId, subjectId, unitId: scopeUnitId, chapterId: scopeChapterId, topicId: scopeTopicId, subTopicId: scopeSubTopicId, format, singleLevel, exportLevel, contextLockLevel } = body || {};

        if (!examId || !subjectId) {
            return NextResponse.json(
                { success: false, message: "Exam and Subject are required for export" },
                { status: 400 }
            );
        }

        // Context-locked export: require scope for unit/chapter/topic
        const lockLevel = (contextLockLevel && String(contextLockLevel).toLowerCase()) || "";
        if (lockLevel === "unit" && !scopeUnitId) {
            return NextResponse.json({ success: false, message: "Unit is required for context-locked export at Unit level" }, { status: 400 });
        }
        if (lockLevel === "chapter" && (!scopeUnitId || !scopeChapterId)) {
            return NextResponse.json({ success: false, message: "Unit and Chapter are required for context-locked export at Chapter level" }, { status: 400 });
        }
        if (lockLevel === "topic" && (!scopeUnitId || !scopeChapterId || !scopeTopicId)) {
            return NextResponse.json({ success: false, message: "Unit, Chapter, and Topic are required for context-locked export at Topic level" }, { status: 400 });
        }

        const examObjId = new mongoose.Types.ObjectId(examId);
        const subjectObjId = new mongoose.Types.ObjectId(subjectId);

        // Base filter: always restrict to this exam + subject
        const matchFilter = {
            examId: examObjId,
            subjectId: subjectObjId
        };

        // Scope: if user selected a specific unit/chapter/topic/subtopic, export only that node and its children
        let allUnits, allChapters, allTopics, allSubTopics, allDefinitions;

        if (scopeSubTopicId) {
            // Export: selected subtopic + its definitions only (need full hierarchy for row labels)
            const subTopicObjId = new mongoose.Types.ObjectId(scopeSubTopicId);
            const oneSubTopic = await SubTopic.findOne({ _id: subTopicObjId, ...matchFilter }).select("_id name orderNumber topicId").lean();
            if (!oneSubTopic) {
                return NextResponse.json({ success: false, message: "SubTopic not found for export scope" }, { status: 404 });
            }
            const oneTopic = await Topic.findOne({ _id: oneSubTopic.topicId }).select("_id name chapterId").lean();
            const oneChapter = oneTopic ? await Chapter.findOne({ _id: oneTopic.chapterId }).select("_id name unitId").lean() : null;
            const oneUnit = oneChapter ? await Unit.findOne({ _id: oneChapter.unitId }).select("_id name orderNumber").lean() : null;
            allUnits = oneUnit ? [oneUnit] : [];
            allChapters = oneChapter ? [oneChapter] : [];
            allTopics = oneTopic ? [oneTopic] : [];
            allSubTopics = [oneSubTopic];
            allDefinitions = await Definition.find({ subTopicId: subTopicObjId }).select("_id name orderNumber unitId chapterId topicId subTopicId").sort({ orderNumber: 1 }).lean();
        } else if (scopeTopicId) {
            // Export: selected topic + its subtopics + definitions
            const topicObjId = new mongoose.Types.ObjectId(scopeTopicId);
            const oneTopic = await Topic.findOne({ _id: topicObjId }).select("_id name orderNumber chapterId").lean();
            if (!oneTopic) {
                return NextResponse.json({ success: false, message: "Topic not found for export scope" }, { status: 404 });
            }
            const oneChapter = await Chapter.findOne({ _id: oneTopic.chapterId }).select("_id name unitId").lean();
            const oneUnit = oneChapter ? await Unit.findOne({ _id: oneChapter.unitId }).select("_id name orderNumber").lean() : null;
            allUnits = oneUnit ? [oneUnit] : [];
            allChapters = oneChapter ? [oneChapter] : [];
            allTopics = [oneTopic];
            allSubTopics = await SubTopic.find({ topicId: topicObjId }).select("_id name orderNumber topicId").sort({ orderNumber: 1 }).lean();
            const subTopicIds = allSubTopics.map(st => st._id);
            allDefinitions = await Definition.find({ subTopicId: { $in: subTopicIds } }).select("_id name orderNumber unitId chapterId topicId subTopicId").sort({ orderNumber: 1 }).lean();
        } else if (scopeChapterId) {
            // Export: selected chapter + its topics, subtopics, definitions
            const chapterObjId = new mongoose.Types.ObjectId(scopeChapterId);
            const oneChapter = await Chapter.findOne({ _id: chapterObjId, ...matchFilter }).select("_id name orderNumber unitId").lean();
            if (!oneChapter) {
                return NextResponse.json({ success: false, message: "Chapter not found for export scope" }, { status: 404 });
            }
            const oneUnit = await Unit.findOne({ _id: oneChapter.unitId }).select("_id name orderNumber").lean();
            allUnits = oneUnit ? [oneUnit] : [];
            allChapters = [oneChapter];
            allTopics = await Topic.find({ chapterId: chapterObjId }).select("_id name orderNumber chapterId").sort({ orderNumber: 1 }).lean();
            const topicIds = allTopics.map(t => t._id);
            allSubTopics = await SubTopic.find({ topicId: { $in: topicIds } }).select("_id name orderNumber topicId").sort({ orderNumber: 1 }).lean();
            const subTopicIds = allSubTopics.map(st => st._id);
            allDefinitions = await Definition.find({ subTopicId: { $in: subTopicIds } }).select("_id name orderNumber unitId chapterId topicId subTopicId").sort({ orderNumber: 1 }).lean();
        } else if (scopeUnitId) {
            // Export: selected unit + its chapters, topics, subtopics, definitions
            const unitObjId = new mongoose.Types.ObjectId(scopeUnitId);
            allUnits = await Unit.find({ _id: unitObjId, ...matchFilter }).select("_id name orderNumber").sort({ orderNumber: 1 }).lean();
            if (allUnits.length === 0) {
                return NextResponse.json({ success: false, message: "Unit not found for export scope" }, { status: 404 });
            }
            const unitIds = allUnits.map(u => u._id);
            allChapters = await Chapter.find({ unitId: { $in: unitIds } }).select("_id name orderNumber unitId").sort({ orderNumber: 1 }).lean();
            const chapterIds = allChapters.map(c => c._id);
            allTopics = await Topic.find({ chapterId: { $in: chapterIds } }).select("_id name orderNumber chapterId").sort({ orderNumber: 1 }).lean();
            const topicIds = allTopics.map(t => t._id);
            allSubTopics = await SubTopic.find({ topicId: { $in: topicIds } }).select("_id name orderNumber topicId").sort({ orderNumber: 1 }).lean();
            const subTopicIds = allSubTopics.map(st => st._id);
            allDefinitions = await Definition.find({ subTopicId: { $in: subTopicIds } }).select("_id name orderNumber unitId chapterId topicId subTopicId").sort({ orderNumber: 1 }).lean();
        } else {
            // Export: full subject (all units and their children)
            allUnits = await Unit.find(matchFilter)
                .select("_id name orderNumber")
                .sort({ orderNumber: 1 })
                .lean();
            const unitIds = allUnits.map(u => u._id);
            allChapters = await Chapter.find({ unitId: { $in: unitIds } })
                .select("_id name orderNumber unitId")
                .sort({ orderNumber: 1 })
                .lean();
            const chapterIds = allChapters.map(c => c._id);
            allTopics = await Topic.find({ chapterId: { $in: chapterIds } })
                .select("_id name orderNumber chapterId")
                .sort({ orderNumber: 1 })
                .lean();
            const topicIds = allTopics.map(t => t._id);
            allSubTopics = await SubTopic.find({ topicId: { $in: topicIds } })
                .select("_id name orderNumber topicId")
                .sort({ orderNumber: 1 })
                .lean();
            const subTopicIds = allSubTopics.map(st => st._id);
            allDefinitions = await Definition.find({ subTopicId: { $in: subTopicIds } })
                .select("_id name orderNumber unitId chapterId topicId subTopicId")
                .sort({ orderNumber: 1 })
                .lean();
        }

        // Single-level export: only the selected level's data, no children (use exportLevel to decide what to keep)
        if (singleLevel === true && exportLevel) {
            const level = String(exportLevel).toLowerCase();
            if (level === "unit") {
                allChapters = [];
                allTopics = [];
                allSubTopics = [];
                allDefinitions = [];
            } else if (level === "chapter") {
                allTopics = [];
                allSubTopics = [];
                allDefinitions = [];
            } else if (level === "topic") {
                allSubTopics = [];
                allDefinitions = [];
            } else if (level === "subtopic") {
                allDefinitions = [];
            } else if (level === "exam" || level === "subject") {
                allUnits = [];
                allChapters = [];
                allTopics = [];
                allSubTopics = [];
                allDefinitions = [];
            }
        }

        const totalItems = allUnits.length + allChapters.length + allTopics.length + allSubTopics.length + allDefinitions.length;
        console.log(`🔍 Export: scope unitId=${scopeUnitId || "all"} chapterId=${scopeChapterId || "-"} topicId=${scopeTopicId || "-"} subTopicId=${scopeSubTopicId || "-"} singleLevel=${!!singleLevel} exportLevel=${exportLevel || "-"}`);
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

        // Context-locked export: filter to children only and use lock-level columns (same structure as import)
        const CONTEXT_LOCK_COLUMNS = {
            subject: ["unit", "chapter", "topic", "subtopic", "definition"],
            unit: ["chapter", "topic", "subtopic", "definition"],
            chapter: ["topic", "subtopic", "definition"],
            topic: ["subtopic", "definition"],
        };
        const CONTEXT_LOCK_HEADERS = {
            subject: ["Unit", "Chapter", "Topic", "SubTopic", "Definition"],
            unit: ["Chapter", "Topic", "SubTopic", "Definition"],
            chapter: ["Topic", "SubTopic", "Definition"],
            topic: ["SubTopic", "Definition"],
        };
        let dataToExport = exportData;
        let isContextLocked = lockLevel && CONTEXT_LOCK_COLUMNS[lockLevel];
        if (isContextLocked) {
            const allowedTypes = { subject: ["unit", "chapter", "topic", "subtopic", "definition"], unit: ["chapter", "topic", "subtopic", "definition"], chapter: ["topic", "subtopic", "definition"], topic: ["subtopic", "definition"] }[lockLevel];
            dataToExport = exportData.filter((row) => allowedTypes.includes(row.type));
        }

        // Single-level: only the selected level's column in file (Unit → only "Unit"; Chapter → only "Chapter"; etc.)
        const FULL_COLUMNS = ["unit", "chapter", "topic", "subtopic", "definition"];
        const FULL_HEADERS = ["Unit", "Chapter", "Topic", "SubTopic", "Definition"];
        let columnsToUse = FULL_COLUMNS;
        let headersToUse = FULL_HEADERS;
        if (isContextLocked) {
            columnsToUse = CONTEXT_LOCK_COLUMNS[lockLevel];
            headersToUse = CONTEXT_LOCK_HEADERS[lockLevel];
        } else if (singleLevel === true && exportLevel) {
            const level = String(exportLevel).toLowerCase();
            const colIndex = FULL_COLUMNS.indexOf(level);
            if (colIndex >= 0) {
                columnsToUse = [FULL_COLUMNS[colIndex]];
                headersToUse = [FULL_HEADERS[colIndex]];
            }
        }

        // Return JSON format when requested
        if (format === "json") {
            const dataForJson = (singleLevel === true && columnsToUse.length < FULL_COLUMNS.length) || isContextLocked
                ? dataToExport.map(row => {
                    const out = {};
                    columnsToUse.forEach((col, i) => { out[headersToUse[i]] = row[col] ?? ""; });
                    return out;
                })
                : dataToExport;
            const payload = {
                success: true,
                data: dataForJson,
                count: dataForJson.length,
                totalItems: totalItems,
                units: allUnits.length,
                chapters: allChapters.length,
                topics: allTopics.length,
                subtopics: allSubTopics.length,
                definitions: allDefinitions.length,
                size: Buffer.byteLength(JSON.stringify(dataForJson), "utf8")
            };
            console.log(`📄 Export: Returning JSON with ${dataForJson.length} rows, columns: ${headersToUse.join(", ")}`);
            return NextResponse.json(payload);
        }

        // Generate CSV - use only selected columns when single-level
        const headers = headersToUse;

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
        
        const csvRows = dataToExport.map((row, index) => {
            try {
                processedCount++;
                const values = columnsToUse.map(col => escapeCSV(row[col] ?? ""));
                const csvRow = values.join(",");
                return csvRow;
            } catch (error) {
                errorCount++;
                console.error(`❌ Error processing row ${index + 1}/${dataToExport.length}:`, error, row);
                return columnsToUse.map(() => "").join(",");
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
