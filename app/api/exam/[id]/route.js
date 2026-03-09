import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import mongoose from "mongoose";
import { successResponse, errorResponse, handleApiError, notFoundResponse } from "@/utils/apiResponse";
import { ERROR_MESSAGES } from "@/constants";
import { requireAction, requireAuth } from "@/middleware/authMiddleware";
import { logger } from "@/utils/logger";
import cacheManager from "@/utils/cacheManager";

// ---------- GET SINGLE EXAM ----------
// Public access so frontend self-study pages can server-render without auth
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid exam ID", 400);
    }

    const exam = await Exam.findById(id).lean();

    if (!exam) {
      return notFoundResponse(ERROR_MESSAGES.EXAM_NOT_FOUND);
    }

    return successResponse(exam);
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ---------- UPDATE EXAM ----------
export async function PUT(request, { params }) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "PUT");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid exam ID", 400);
    }

    const { name, status, orderNumber } = body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return errorResponse("Exam name is required", 400);
    }

    // Check if exam exists
    const existingExam = await Exam.findById(id);
    if (!existingExam) {
      return notFoundResponse(ERROR_MESSAGES.EXAM_NOT_FOUND);
    }

    // Capitalize exam name
    const examName = name.trim().toUpperCase();

    // Check for duplicate name
    const duplicate = await Exam.findOne({
      name: examName,
      _id: { $ne: id },
    });
    if (duplicate) {
      return errorResponse("Exam with same name already exists", 409);
    }

    // Prepare update data (content/SEO fields are now in ExamDetails)
    const updateData = {
      name: examName,
    };

    if (status) updateData.status = status;
    if (orderNumber !== undefined) updateData.orderNumber = orderNumber;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.description !== undefined) updateData.description = body.description;

    // Debug logging
    console.log("Updating Exam with data:", updateData);

    const updated = await Exam.findByIdAndUpdate(id, { $set: updateData }, {
      new: true,
      runValidators: true,
    });

    console.log("Exam updated in DB:", updated);

    // Clear cache when exam is updated
    cacheManager.clear("exam"); // Clear specific exam cache
    cacheManager.clear("exams-"); // Clear list cache (important for Homepage)

    return successResponse(updated, "Exam updated successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.UPDATE_FAILED);
  }
}

// ---------- PATCH EXAM (Status Update with Cascading) ----------
export async function PATCH(request, { params }) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "PATCH");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid exam ID", 400);
    }

    const { status, orderNumber } = body;

    if (status && !["active", "inactive"].includes(status)) {
      return errorResponse("Valid status is required (active or inactive)", 400);
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (orderNumber !== undefined) updateData.orderNumber = orderNumber;

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No valid update fields provided", 400);
    }

    const updated = await Exam.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!updated) {
      return notFoundResponse(ERROR_MESSAGES.EXAM_NOT_FOUND);
    }

    // Cascading: Update all children status if status changed
    if (status) {
      logger.info(`Cascading status update to ${status} for exam ${id}`);

      // Find all subjects in this exam
      const subjects = await Subject.find({ examId: id });
      const subjectIds = subjects.map((subject) => subject._id);

      // Find all units in these subjects
      const units = await Unit.find({ subjectId: { $in: subjectIds } });
      const unitIds = units.map((unit) => unit._id);

      // Find all chapters in these units
      const chapters = await Chapter.find({ unitId: { $in: unitIds } });
      const chapterIds = chapters.map((chapter) => chapter._id);

      // Find all topics in these chapters
      const topics = await Topic.find({ chapterId: { $in: chapterIds } });
      const topicIds = topics.map((topic) => topic._id);

      // Update all subtopics in these topics
      let subTopicsResult = { modifiedCount: 0 };
      if (topicIds.length > 0) {
        subTopicsResult = await SubTopic.updateMany(
          { topicId: { $in: topicIds } },
          { $set: { status } }
        );
      }
      logger.info(`Updated ${subTopicsResult.modifiedCount} SubTopics`);

      // Update all topics in these chapters
      let topicsResult = { modifiedCount: 0 };
      if (chapterIds.length > 0) {
        topicsResult = await Topic.updateMany(
          { chapterId: { $in: chapterIds } },
          { $set: { status } }
        );
      }
      logger.info(`Updated ${topicsResult.modifiedCount} Topics`);

      // Update all chapters in these units
      let chaptersResult = { modifiedCount: 0 };
      if (unitIds.length > 0) {
        chaptersResult = await Chapter.updateMany(
          { unitId: { $in: unitIds } },
          { $set: { status } }
        );
      }
      logger.info(`Updated ${chaptersResult.modifiedCount} Chapters`);

      // Update all units in these subjects
      let unitsResult = { modifiedCount: 0 };
      if (subjectIds.length > 0) {
        unitsResult = await Unit.updateMany(
          { subjectId: { $in: subjectIds } },
          { $set: { status } }
        );
      }
      logger.info(`Updated ${unitsResult.modifiedCount} Units`);

      // Update all subjects in this exam
      const subjectsResult = await Subject.updateMany(
        { examId: id },
        { $set: { status } }
      );
      logger.info(`Updated ${subjectsResult.modifiedCount} Subjects`);
    }

    // Clear cache for exam queries
    cacheManager.clear("exam");

    return successResponse(
      updated,
      `Exam and all children ${status === "inactive" ? "deactivated" : "activated"} successfully`
    );
  } catch (error) {
    return handleApiError(error, "Failed to update exam");
  }
}

// ---------- DELETE EXAM ----------
export async function DELETE(request, { params }) {
  try {
    // Check authentication and permissions
    const authCheck = await requireAction(request, "DELETE");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid exam ID", 400);
    }

    const deleted = await Exam.findByIdAndDelete(id);
    if (!deleted) {
      return notFoundResponse(ERROR_MESSAGES.EXAM_NOT_FOUND);
    }

    // Re-sequence orderNumber to 1, 2, 3, ... (unique, no gaps)
    const remaining = await Exam.find({}).sort({ orderNumber: 1, createdAt: 1 }).select("_id").lean();
    if (remaining.length > 0) {
      const tempUpdates = remaining.map((exam, index) => ({
        updateOne: {
          filter: { _id: exam._id },
          update: { $set: { orderNumber: 100000 + index } },
        },
      }));
      await Exam.bulkWrite(tempUpdates);
      const finalUpdates = remaining.map((exam, index) => ({
        updateOne: {
          filter: { _id: exam._id },
          update: { $set: { orderNumber: index + 1 } },
        },
      }));
      await Exam.bulkWrite(finalUpdates);
    }

    // Clear cache when exam is deleted
    cacheManager.clear("exam");

    return successResponse(deleted, "Exam deleted successfully");
  } catch (error) {
    return handleApiError(error, ERROR_MESSAGES.DELETE_FAILED);
  }
}

