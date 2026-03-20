/**
 * Cascade status updates through the hierarchy while respecting manualInactive.
 * Used by Exam, Subject, Unit, Chapter, Topic, SubTopic status APIs.
 *
 * cascadeMode:
 * - respect_manual: when activating, skip nodes (and their subtree) where manualInactive === true
 * - force_all: set status on all descendants regardless of manualInactive
 * - direct_only: when activating, update only direct children (respecting manualInactive); do not recurse
 */

import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
import { logger } from "@/utils/logger";

/**
 * Cascade status from Exam to all children.
 * @param {string} examId
 * @param {"active"|"inactive"} status
 * @param {"respect_manual"|"force_all"|"direct_only"} cascadeMode
 */
export async function cascadeExamStatus(examId, status, cascadeMode = "respect_manual") {
  if (status === "inactive") {
    await Promise.all([
      Subject.updateMany({ examId }, { $set: { status } }),
      Unit.updateMany({ examId }, { $set: { status } }),
      Chapter.updateMany({ examId }, { $set: { status } }),
      Topic.updateMany({ examId }, { $set: { status } }),
      SubTopic.updateMany({ examId }, { $set: { status } }),
      Definition.updateMany({ examId }, { $set: { status } }),
    ]);
    logger.info(`Cascade exam ${examId} → inactive (all children)`);
    return;
  }

  if (cascadeMode === "force_all") {
    await Promise.all([
      Subject.updateMany({ examId }, { $set: { status } }),
      Unit.updateMany({ examId }, { $set: { status } }),
      Chapter.updateMany({ examId }, { $set: { status } }),
      Topic.updateMany({ examId }, { $set: { status } }),
      SubTopic.updateMany({ examId }, { $set: { status } }),
      Definition.updateMany({ examId }, { $set: { status } }),
    ]);
    logger.info(`Cascade exam ${examId} → active (force_all)`);
    return;
  }

  if (cascadeMode === "direct_only") {
    await Subject.updateMany(
      { examId, $or: [{ manualInactive: { $ne: true } }, { manualInactive: null }] },
      { $set: { status } },
    );
    logger.info(`Cascade exam ${examId} → active (direct_only, subjects only)`);
    return;
  }

  // respect_manual: level-by-level, skip manualInactive and their subtree
  const subjectDocs = await Subject.find({ examId }).select("_id manualInactive").lean();
  const subjectIdsToActivate = subjectDocs.filter((s) => !s.manualInactive).map((s) => s._id);
  if (subjectIdsToActivate.length > 0) {
    await Subject.updateMany(
      { _id: { $in: subjectIdsToActivate } },
      { $set: { status } },
    );
  }

  const unitDocs = await Unit.find({ subjectId: { $in: subjectIdsToActivate } }).select("_id manualInactive").lean();
  const unitIdsToActivate = unitDocs.filter((u) => !u.manualInactive).map((u) => u._id);
  if (unitIdsToActivate.length > 0) {
    await Unit.updateMany(
      { _id: { $in: unitIdsToActivate } },
      { $set: { status } },
    );
  }

  const chapterDocs = await Chapter.find({ unitId: { $in: unitIdsToActivate } }).select("_id manualInactive").lean();
  const chapterIdsToActivate = chapterDocs.filter((c) => !c.manualInactive).map((c) => c._id);
  if (chapterIdsToActivate.length > 0) {
    await Chapter.updateMany(
      { _id: { $in: chapterIdsToActivate } },
      { $set: { status } },
    );
  }

  const topicDocs = await Topic.find({ chapterId: { $in: chapterIdsToActivate } }).select("_id manualInactive").lean();
  const topicIdsToActivate = topicDocs.filter((t) => !t.manualInactive).map((t) => t._id);
  if (topicIdsToActivate.length > 0) {
    await Topic.updateMany(
      { _id: { $in: topicIdsToActivate } },
      { $set: { status } },
    );
  }

  const subtopicDocs = await SubTopic.find({ topicId: { $in: topicIdsToActivate } }).select("_id manualInactive").lean();
  const subtopicIdsToActivate = subtopicDocs.filter((s) => !s.manualInactive).map((s) => s._id);
  if (subtopicIdsToActivate.length > 0) {
    await SubTopic.updateMany(
      { _id: { $in: subtopicIdsToActivate } },
      { $set: { status } },
    );
  }

  if (subtopicIdsToActivate.length > 0) {
    await Definition.updateMany(
      { subTopicId: { $in: subtopicIdsToActivate } },
      { $set: { status } },
    );
  }

  logger.info(`Cascade exam ${examId} → active (respect_manual)`);
}

/**
 * Cascade status from Subject to Units → Chapters → Topics → SubTopics → Definitions.
 */
export async function cascadeSubjectStatus(subjectId, status, cascadeMode = "respect_manual") {
  if (status === "inactive") {
    const units = await Unit.find({ subjectId }).select("_id").lean();
    const unitIds = units.map((u) => u._id);
    const chapters = await Chapter.find({ unitId: { $in: unitIds } }).select("_id").lean();
    const chapterIds = chapters.map((c) => c._id);
    const topics = await Topic.find({ chapterId: { $in: chapterIds } }).select("_id").lean();
    const topicIds = topics.map((t) => t._id);
    const subtopics = await SubTopic.find({ topicId: { $in: topicIds } }).select("_id").lean();
    const subtopicIds = subtopics.map((s) => s._id);
    await Promise.all([
      Unit.updateMany({ subjectId }, { $set: { status } }),
      Chapter.updateMany({ unitId: { $in: unitIds } }, { $set: { status } }),
      Topic.updateMany({ chapterId: { $in: chapterIds } }, { $set: { status } }),
      SubTopic.updateMany({ topicId: { $in: topicIds } }, { $set: { status } }),
      Definition.updateMany({ subTopicId: { $in: subtopicIds } }, { $set: { status } }),
    ]);
    logger.info(`Cascade subject ${subjectId} → inactive`);
    return;
  }

  if (cascadeMode === "force_all") {
    const units = await Unit.find({ subjectId }).select("_id").lean();
    const unitIds = units.map((u) => u._id);
    const chapters = await Chapter.find({ unitId: { $in: unitIds } }).select("_id").lean();
    const chapterIds = chapters.map((c) => c._id);
    const topics = await Topic.find({ chapterId: { $in: chapterIds } }).select("_id").lean();
    const topicIds = topics.map((t) => t._id);
    const subtopics = await SubTopic.find({ topicId: { $in: topicIds } }).select("_id").lean();
    const subtopicIds = subtopics.map((s) => s._id);
    await Promise.all([
      Unit.updateMany({ subjectId }, { $set: { status } }),
      Chapter.updateMany({ unitId: { $in: unitIds } }, { $set: { status } }),
      Topic.updateMany({ chapterId: { $in: chapterIds } }, { $set: { status } }),
      SubTopic.updateMany({ topicId: { $in: topicIds } }, { $set: { status } }),
      Definition.updateMany({ subTopicId: { $in: subtopicIds } }, { $set: { status } }),
    ]);
    logger.info(`Cascade subject ${subjectId} → active (force_all)`);
    return;
  }

  if (cascadeMode === "direct_only") {
    await Unit.updateMany(
      { subjectId, $or: [{ manualInactive: { $ne: true } }, { manualInactive: null }] },
      { $set: { status } },
    );
    logger.info(`Cascade subject ${subjectId} → active (direct_only)`);
    return;
  }

  const unitDocs = await Unit.find({ subjectId }).select("_id manualInactive").lean();
  const unitIdsToActivate = unitDocs.filter((u) => !u.manualInactive).map((u) => u._id);
  if (unitIdsToActivate.length > 0) await Unit.updateMany({ _id: { $in: unitIdsToActivate } }, { $set: { status } });

  const chapterDocs = await Chapter.find({ unitId: { $in: unitIdsToActivate } }).select("_id manualInactive").lean();
  const chapterIdsToActivate = chapterDocs.filter((c) => !c.manualInactive).map((c) => c._id);
  if (chapterIdsToActivate.length > 0) await Chapter.updateMany({ _id: { $in: chapterIdsToActivate } }, { $set: { status } });

  const topicDocs = await Topic.find({ chapterId: { $in: chapterIdsToActivate } }).select("_id manualInactive").lean();
  const topicIdsToActivate = topicDocs.filter((t) => !t.manualInactive).map((t) => t._id);
  if (topicIdsToActivate.length > 0) await Topic.updateMany({ _id: { $in: topicIdsToActivate } }, { $set: { status } });

  const subtopicDocs = await SubTopic.find({ topicId: { $in: topicIdsToActivate } }).select("_id manualInactive").lean();
  const subtopicIdsToActivate = subtopicDocs.filter((s) => !s.manualInactive).map((s) => s._id);
  if (subtopicIdsToActivate.length > 0) {
    await SubTopic.updateMany({ _id: { $in: subtopicIdsToActivate } }, { $set: { status } });
    await Definition.updateMany({ subTopicId: { $in: subtopicIdsToActivate } }, { $set: { status } });
  }
  logger.info(`Cascade subject ${subjectId} → active (respect_manual)`);
}

/**
 * Cascade status from Unit to Chapters → Topics → SubTopics → Definitions.
 */
export async function cascadeUnitStatus(unitId, status, cascadeMode = "respect_manual") {
  if (status === "inactive") {
    const chapters = await Chapter.find({ unitId }).select("_id").lean();
    const chapterIds = chapters.map((c) => c._id);
    const topics = await Topic.find({ chapterId: { $in: chapterIds } }).select("_id").lean();
    const topicIds = topics.map((t) => t._id);
    const subtopics = await SubTopic.find({ topicId: { $in: topicIds } }).select("_id").lean();
    const subtopicIds = subtopics.map((s) => s._id);
    await Promise.all([
      Chapter.updateMany({ unitId }, { $set: { status } }),
      Topic.updateMany({ chapterId: { $in: chapterIds } }, { $set: { status } }),
      SubTopic.updateMany({ topicId: { $in: topicIds } }, { $set: { status } }),
      Definition.updateMany({ subTopicId: { $in: subtopicIds } }, { $set: { status } }),
    ]);
    logger.info(`Cascade unit ${unitId} → inactive`);
    return;
  }

  if (cascadeMode === "force_all") {
    const chapters = await Chapter.find({ unitId }).select("_id").lean();
    const chapterIds = chapters.map((c) => c._id);
    const topics = await Topic.find({ chapterId: { $in: chapterIds } }).select("_id").lean();
    const topicIds = topics.map((t) => t._id);
    const subtopics = await SubTopic.find({ topicId: { $in: topicIds } }).select("_id").lean();
    const subtopicIds = subtopics.map((s) => s._id);
    await Promise.all([
      Chapter.updateMany({ unitId }, { $set: { status } }),
      Topic.updateMany({ chapterId: { $in: chapterIds } }, { $set: { status } }),
      SubTopic.updateMany({ topicId: { $in: topicIds } }, { $set: { status } }),
      Definition.updateMany({ subTopicId: { $in: subtopicIds } }, { $set: { status } }),
    ]);
    logger.info(`Cascade unit ${unitId} → active (force_all)`);
    return;
  }

  if (cascadeMode === "direct_only") {
    await Chapter.updateMany(
      { unitId, $or: [{ manualInactive: { $ne: true } }, { manualInactive: null }] },
      { $set: { status } },
    );
    logger.info(`Cascade unit ${unitId} → active (direct_only)`);
    return;
  }

  const chapterDocs = await Chapter.find({ unitId }).select("_id manualInactive").lean();
  const chapterIdsToActivate = chapterDocs.filter((c) => !c.manualInactive).map((c) => c._id);
  if (chapterIdsToActivate.length > 0) await Chapter.updateMany({ _id: { $in: chapterIdsToActivate } }, { $set: { status } });

  const topicDocs = await Topic.find({ chapterId: { $in: chapterIdsToActivate } }).select("_id manualInactive").lean();
  const topicIdsToActivate = topicDocs.filter((t) => !t.manualInactive).map((t) => t._id);
  if (topicIdsToActivate.length > 0) await Topic.updateMany({ _id: { $in: topicIdsToActivate } }, { $set: { status } });

  const subtopicDocs = await SubTopic.find({ topicId: { $in: topicIdsToActivate } }).select("_id manualInactive").lean();
  const subtopicIdsToActivate = subtopicDocs.filter((s) => !s.manualInactive).map((s) => s._id);
  if (subtopicIdsToActivate.length > 0) {
    await SubTopic.updateMany({ _id: { $in: subtopicIdsToActivate } }, { $set: { status } });
    await Definition.updateMany({ subTopicId: { $in: subtopicIdsToActivate } }, { $set: { status } });
  }
  logger.info(`Cascade unit ${unitId} → active (respect_manual)`);
}

/**
 * Cascade status from Chapter to Topics → SubTopics → Definitions.
 */
export async function cascadeChapterStatus(chapterId, status, cascadeMode = "respect_manual") {
  if (status === "inactive") {
    const topics = await Topic.find({ chapterId }).select("_id").lean();
    const topicIds = topics.map((t) => t._id);
    const subtopics = await SubTopic.find({ topicId: { $in: topicIds } }).select("_id").lean();
    const subtopicIds = subtopics.map((s) => s._id);
    await Promise.all([
      Topic.updateMany({ chapterId }, { $set: { status } }),
      SubTopic.updateMany({ topicId: { $in: topicIds } }, { $set: { status } }),
      Definition.updateMany({ subTopicId: { $in: subtopicIds } }, { $set: { status } }),
    ]);
    logger.info(`Cascade chapter ${chapterId} → inactive`);
    return;
  }

  if (cascadeMode === "force_all") {
    const topics = await Topic.find({ chapterId }).select("_id").lean();
    const topicIds = topics.map((t) => t._id);
    const subtopics = await SubTopic.find({ topicId: { $in: topicIds } }).select("_id").lean();
    const subtopicIds = subtopics.map((s) => s._id);
    await Promise.all([
      Topic.updateMany({ chapterId }, { $set: { status } }),
      SubTopic.updateMany({ topicId: { $in: topicIds } }, { $set: { status } }),
      Definition.updateMany({ subTopicId: { $in: subtopicIds } }, { $set: { status } }),
    ]);
    logger.info(`Cascade chapter ${chapterId} → active (force_all)`);
    return;
  }

  if (cascadeMode === "direct_only") {
    await Topic.updateMany(
      { chapterId, $or: [{ manualInactive: { $ne: true } }, { manualInactive: null }] },
      { $set: { status } },
    );
    logger.info(`Cascade chapter ${chapterId} → active (direct_only)`);
    return;
  }

  const topicDocs = await Topic.find({ chapterId }).select("_id manualInactive").lean();
  const topicIdsToActivate = topicDocs.filter((t) => !t.manualInactive).map((t) => t._id);
  if (topicIdsToActivate.length > 0) await Topic.updateMany({ _id: { $in: topicIdsToActivate } }, { $set: { status } });

  const subtopicDocs = await SubTopic.find({ topicId: { $in: topicIdsToActivate } }).select("_id manualInactive").lean();
  const subtopicIdsToActivate = subtopicDocs.filter((s) => !s.manualInactive).map((s) => s._id);
  if (subtopicIdsToActivate.length > 0) {
    await SubTopic.updateMany({ _id: { $in: subtopicIdsToActivate } }, { $set: { status } });
    await Definition.updateMany({ subTopicId: { $in: subtopicIdsToActivate } }, { $set: { status } });
  }
  logger.info(`Cascade chapter ${chapterId} → active (respect_manual)`);
}

/**
 * Cascade status from Topic to SubTopics → Definitions.
 */
export async function cascadeTopicStatus(topicId, status, cascadeMode = "respect_manual") {
  if (status === "inactive") {
    const subtopics = await SubTopic.find({ topicId }).select("_id").lean();
    const subtopicIds = subtopics.map((s) => s._id);
    await Promise.all([
      SubTopic.updateMany({ topicId }, { $set: { status } }),
      Definition.updateMany({ subTopicId: { $in: subtopicIds } }, { $set: { status } }),
    ]);
    logger.info(`Cascade topic ${topicId} → inactive`);
    return;
  }

  if (cascadeMode === "force_all") {
    const subtopics = await SubTopic.find({ topicId }).select("_id").lean();
    const subtopicIds = subtopics.map((s) => s._id);
    await Promise.all([
      SubTopic.updateMany({ topicId }, { $set: { status } }),
      Definition.updateMany({ subTopicId: { $in: subtopicIds } }, { $set: { status } }),
    ]);
    logger.info(`Cascade topic ${topicId} → active (force_all)`);
    return;
  }

  if (cascadeMode === "direct_only") {
    await SubTopic.updateMany(
      { topicId, $or: [{ manualInactive: { $ne: true } }, { manualInactive: null }] },
      { $set: { status } },
    );
    logger.info(`Cascade topic ${topicId} → active (direct_only)`);
    return;
  }

  const subtopicDocs = await SubTopic.find({ topicId }).select("_id manualInactive").lean();
  const subtopicIdsToActivate = subtopicDocs.filter((s) => !s.manualInactive).map((s) => s._id);
  if (subtopicIdsToActivate.length > 0) {
    await SubTopic.updateMany({ _id: { $in: subtopicIdsToActivate } }, { $set: { status } });
    await Definition.updateMany({ subTopicId: { $in: subtopicIdsToActivate } }, { $set: { status } });
  }
  logger.info(`Cascade topic ${topicId} → active (respect_manual)`);
}

/**
 * Cascade status from SubTopic to Definitions only.
 */
export async function cascadeSubTopicStatus(subTopicId, status, cascadeMode = "respect_manual") {
  if (status === "inactive") {
    await Definition.updateMany({ subTopicId }, { $set: { status } });
    logger.info(`Cascade subtopic ${subTopicId} → inactive`);
    return;
  }

  if (cascadeMode === "force_all") {
    await Definition.updateMany({ subTopicId }, { $set: { status } });
    logger.info(`Cascade subtopic ${subTopicId} → active (force_all)`);
    return;
  }

  if (cascadeMode === "direct_only" || cascadeMode === "respect_manual") {
    await Definition.updateMany(
      { subTopicId, $or: [{ manualInactive: { $ne: true } }, { manualInactive: null }] },
      { $set: { status } },
    );
    logger.info(`Cascade subtopic ${subTopicId} → active (respect_manual/direct_only)`);
  }
}
