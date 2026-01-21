import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import { requireAction } from "@/middleware/authMiddleware";
import { createSlug, generateUniqueSlug } from "@/utils/serverSlug";

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
    exam: { main: Exam, details: ExamDetails, refField: "examId", parents: [] },
    subject: { main: Subject, details: SubjectDetails, refField: "subjectId", parents: ["examId"] },
    unit: { main: Unit, details: UnitDetails, refField: "unitId", parents: ["examId", "subjectId"] },
    chapter: { main: Chapter, details: ChapterDetails, refField: "chapterId", parents: ["examId", "subjectId", "unitId"] },
    topic: { main: Topic, details: TopicDetails, refField: "topicId", parents: ["examId", "subjectId", "unitId", "chapterId"] },
    subtopic: { main: SubTopic, details: SubTopicDetails, refField: "subTopicId", parents: ["examId", "subjectId", "unitId", "chapterId", "topicId"] },
    definition: { main: Definition, details: DefinitionDetails, refField: "definitionId", parents: ["examId", "subjectId", "unitId", "chapterId", "topicId", "subTopicId"] },
};

export async function POST(request) {
    try {
        const authCheck = await requireAction(request, "POST");
        if (authCheck.error) {
            return NextResponse.json(authCheck, { status: authCheck.status || 401 });
        }

        await connectDB();
        const { type, data, filters } = await request.json();

        if (!type || !MODEL_MAP[type]) {
            return NextResponse.json({ success: false, message: "Invalid type" }, { status: 400 });
        }

        const { main, details, refField, parents } = MODEL_MAP[type];

        let successCount = 0;
        let updateCount = 0;
        let failCount = 0;
        const errors = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
                const name = row.name || row.Name;
                if (!name) {
                    failCount++;
                    errors.push(`Row ${i + 1}: Name is required`);
                    continue;
                }

                const id = row.id || row.ID;
                const orderNumber = parseInt(row.ordernumber || row.OrderNumber || 0);
                const title = row.seotitle || row["SEO Title"] || "";
                const metaDescription = row.metadescription || row["Meta Description"] || "";
                const keywords = row.keywords || row.Keywords || "";
                const status = row.status || row.Status || "active";

                let entity;

                // 1. Try finding by ID
                if (id && mongoose.Types.ObjectId.isValid(id)) {
                    entity = await main.findById(id);
                }

                // 2. Try finding by Name + Parents
                if (!entity) {
                    const query = {
                        name: { $regex: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
                    };
                    parents.forEach(p => {
                        if (filters[p]) query[p] = new mongoose.Types.ObjectId(filters[p]);
                    });
                    entity = await main.findOne(query);
                }

                if (entity) {
                    // Update existing
                    entity.name = name;
                    if (orderNumber) entity.orderNumber = orderNumber;

                    // Regenerate slug if needed
                    if (entity.isModified("name")) {
                        const baseSlug = createSlug(name);
                        const checkExists = async (slug, excludeId) => {
                            const query = { slug };
                            parents.forEach(p => {
                                if (filters[p]) query[p] = new mongoose.Types.ObjectId(filters[p]);
                            });
                            if (excludeId) query._id = { $ne: excludeId };
                            const existing = await main.findOne(query);
                            return !!existing;
                        };
                        entity.slug = await generateUniqueSlug(baseSlug, checkExists, entity._id);
                    }

                    await entity.save();
                    updateCount++;
                } else {
                    // Create new
                    const payload = {
                        name,
                        status: status === 'publish' ? 'active' : 'active' // Map status to main status
                    };
                    if (orderNumber) payload.orderNumber = orderNumber;
                    parents.forEach(p => {
                        if (filters[p]) payload[p] = new mongoose.Types.ObjectId(filters[p]);
                    });

                    // Slug handled by pre-save hook in model (usually)
                    // If not, we manually handle it here. Most of your models have pre-save slug hooks.
                    entity = await main.create(payload);
                    successCount++;
                }

                const detailPayload = {
                    title,
                    metaDescription,
                    keywords,
                    status: status // publish, unpublish, draft
                };

                await details.findOneAndUpdate(
                    { [refField]: entity._id },
                    { $set: detailPayload },
                    { upsert: true, new: true, runValidators: true }
                );

            } catch (err) {
                console.error(`Error processing row ${i + 1}:`, err);
                failCount++;
                errors.push(`Row ${i + 1}: ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${data.length} rows: ${successCount} created, ${updateCount} updated, ${failCount} failed.`,
            stats: { success: successCount, updated: updateCount, failed: failCount },
            errors
        });

    } catch (error) {
        console.error("SEO Import Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
