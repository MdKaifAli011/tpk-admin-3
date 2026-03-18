import { NextResponse } from "next/server";
import slugify from "slugify";
import connectDB from "@/lib/mongodb";
import Thread from "@/models/Thread";
import Reply from "@/models/Reply";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
import { verifyToken } from "@/lib/auth";
import { verifyStudentToken } from "@/lib/studentAuth";
import {
  getCurrentLevel,
  buildThreadQueryAtLevel,
  getParentLevel,
  getParentIds,
} from "@/lib/discussionListFallback";
import { sendMail } from "@/lib/mailer";
import { getEmailTemplateContent } from "@/lib/getEmailTemplateContent";
import { getAuthorEmail } from "@/lib/getAuthorEmail";

// Helper to get user from request (either Student, Admin, or Guest)
async function getUser(request) {
  // 1. Try Admin first (Crucial for moderation logic)
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = verifyToken(token);
      if (decoded) {
        return { id: decoded.userId || decoded.id, type: "User" };
      }
    } catch (e) {
      /* ignore admin token error */
    }
  }

  // 2. Try student
  const studentAuth = await verifyStudentToken(request);
  if (!studentAuth.error) {
    return { id: studentAuth.studentId, type: "Student" };
  }

  // 3. Try Guest
  const guestId = request.headers.get("x-guest-id");
  const guestName = request.headers.get("x-guest-name");
  if (guestId) {
    return { id: guestId, name: guestName || "Guest", type: "Guest" };
  }

  return null;
}

const LEVEL_TO_CHILD = {
  exam: "subject",
  subject: "unit",
  unit: "chapter",
  chapter: "topic",
  topic: "subtopic",
  subtopic: "definition",
  definition: null,
};

const CHILD_MODELS = {
  subject: { model: Subject, parentKey: "examId" },
  unit: { model: Unit, parentKey: "subjectId" },
  chapter: { model: Chapter, parentKey: "unitId" },
  topic: { model: Topic, parentKey: "chapterId" },
  subtopic: { model: SubTopic, parentKey: "topicId" },
  definition: { model: Definition, parentKey: "subTopicId" },
};

function getSortOption(sort) {
  if (sort === "hot") return { isPinned: -1, views: -1, replyCount: -1 };
  if (sort === "views") return { isPinned: -1, views: -1, createdAt: -1 };
  if (sort === "date_asc") return { isPinned: -1, createdAt: 1 };
  if (sort === "date_desc") return { isPinned: -1, createdAt: -1 };
  // "new" / default: strict newest first so recent threads (e.g. 2m ago) appear at top
  return { createdAt: -1 };
}

/** Children of current node only (e.g. Unit1 → only Unit1's chapters). */
async function getOrderedChildren(level, ids) {
  const childLevel = LEVEL_TO_CHILD[level];
  if (!childLevel || !CHILD_MODELS[childLevel]) return [];
  const { model, parentKey } = CHILD_MODELS[childLevel];
  const parentId = ids[parentKey];
  if (!parentId) return [];
  return model
    .find({ [parentKey]: parentId })
    .sort({ orderNumber: 1, name: 1 })
    .select("_id name")
    .lean();
}

/** One API call: current → parent (same branch) → first child with threads. */
async function runListCascade(searchParams, params) {
  const { level, ids } = getCurrentLevel(searchParams);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const skip = (page - 1) * limit;
  const sortOption = getSortOption(params.sort);

  const baseQuery = { isApproved: true };
  if (params.search) {
    baseQuery.title = { $regex: params.search, $options: "i" };
  }
  if (params.tag && params.tag !== "All Topics" && params.tag !== "All")
    baseQuery.tags = params.tag;
  if (params.dateFrom || params.dateTo) {
    baseQuery.createdAt = {};
    if (params.dateFrom)
      baseQuery.createdAt.$gte = new Date(params.dateFrom + "T00:00:00.000Z");
    if (params.dateTo)
      baseQuery.createdAt.$lte = new Date(params.dateTo + "T23:59:59.999Z");
  }

  const runQuery = (levelQuery) => ({ ...baseQuery, ...levelQuery });

  const populateOptions = [
    { path: "author", select: "firstName lastName avatar email role" },
    { path: "examId", select: "name slug" },
    { path: "subjectId", select: "name slug" },
    { path: "unitId", select: "name slug" },
    { path: "chapterId", select: "name slug" },
    { path: "topicId", select: "name slug" },
    { path: "subTopicId", select: "name slug" },
    { path: "definitionId", select: "name slug" },
  ];

  // 1) Current level
  const currentLevelQuery = buildThreadQueryAtLevel(level, ids);
  let total = await Thread.countDocuments(runQuery(currentLevelQuery));
  if (total > 0) {
    const threads = await Thread.find(runQuery(currentLevelQuery))
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate(populateOptions)
      .lean();
    return {
      success: true,
      data: threads,
      listSource: "current",
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  // 2) Parent (same branch: e.g. chapter → unit that contains this chapter; topic → chapter that contains this topic)
  const parentLevel = getParentLevel(level);
  const parentIds = getParentIds(level, ids);
  if (parentLevel && parentIds) {
    const parentLevelQuery = buildThreadQueryAtLevel(parentLevel, parentIds);
    total = await Thread.countDocuments(runQuery(parentLevelQuery));
    if (total > 0) {
      const threads = await Thread.find(runQuery(parentLevelQuery))
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate(populateOptions)
        .lean();
      return {
        success: true,
        data: threads,
        listSource: "parent",
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }
  }

  // 3) First child that has threads (same branch only)
  const children = await getOrderedChildren(level, ids);
  const childLevel = LEVEL_TO_CHILD[level];
  const keys = [
    "examId",
    "subjectId",
    "unitId",
    "chapterId",
    "topicId",
    "subTopicId",
    "definitionId",
  ];
  const childKey = childLevel === "subtopic" ? "subTopicId" : childLevel + "Id";
  const childLevelIdx = keys.indexOf(childKey);

  for (const child of children) {
    const childIds = { ...ids };
    childIds[childKey] = child._id.toString();
    for (let i = childLevelIdx + 1; i < keys.length; i++)
      childIds[keys[i]] = null;
    const childLevelQuery = buildThreadQueryAtLevel(childLevel, childIds);
    total = await Thread.countDocuments(runQuery(childLevelQuery));
    if (total > 0) {
      const threads = await Thread.find(runQuery(childLevelQuery))
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate(populateOptions)
        .lean();
      return {
        success: true,
        data: threads,
        listSource: "child",
        fallbackChildId: child._id.toString(),
        fallbackChildName: child.name || "",
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }
  }

  // 4) Same-branch fallback: no threads at current/parent/child — show other threads from same exam so page isn't blank
  if (ids.examId) {
    const sameBranchQuery = { ...baseQuery, examId: ids.examId };
    total = await Thread.countDocuments(sameBranchQuery);
    if (total > 0) {
      const threads = await Thread.find(sameBranchQuery)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate(populateOptions)
        .lean();
      return {
        success: true,
        data: threads,
        listSource: "same_branch",
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }
  }

  return {
    success: true,
    data: [],
    listSource: "none",
    pagination: { total: 0, page, limit, pages: 0 },
  };
}

// GET: List threads (filtered)
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const examId = searchParams.get("examId");
    const subjectId = searchParams.get("subjectId");
    const unitId = searchParams.get("unitId");
    const chapterId = searchParams.get("chapterId");
    const topicId = searchParams.get("topicId");
    const subTopicId = searchParams.get("subTopicId");
    const definitionId = searchParams.get("definitionId");

    const sort = searchParams.get("sort") || "new";
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const user = await getUser(request);
    const isAdmin = user?.type === "User";
    const status = searchParams.get("status");
    const hasHierarchy = !!(
      examId ||
      subjectId ||
      unitId ||
      chapterId ||
      topicId ||
      subTopicId ||
      definitionId
    );

    /** Header search modal: only examId + text — strict to this exam (no global leak). Title + content match. */
    const examOnlySearch =
      !isAdmin &&
      examId &&
      search &&
      String(search).trim() &&
      !subjectId &&
      !unitId &&
      !chapterId &&
      !topicId &&
      !subTopicId &&
      !definitionId;

    if (examOnlySearch) {
      const safe = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safe, "i");
      const sortOption = getSortOption(sort);
      const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 50);
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const skip = (page - 1) * limit;
      const q = {
        isApproved: true,
        examId,
        $or: [{ title: regex }, { content: regex }],
      };
      const populateOptions = [
        { path: "author", select: "firstName lastName avatar email role" },
        { path: "examId", select: "name slug" },
        { path: "subjectId", select: "name slug" },
        { path: "unitId", select: "name slug" },
        { path: "chapterId", select: "name slug" },
        { path: "topicId", select: "name slug" },
        { path: "subTopicId", select: "name slug" },
      ];
      const [threads, total] = await Promise.all([
        Thread.find(q).sort(sortOption).skip(skip).limit(limit).populate(populateOptions).lean(),
        Thread.countDocuments(q),
      ]);
      return NextResponse.json({
        success: true,
        data: threads,
        listSource: "exam_search",
        pagination: { total, page, limit, pages: Math.ceil(total / limit) || 0 },
      });
    }

    if (!isAdmin && hasHierarchy) {
      const result = await runListCascade(searchParams, {
        examId,
        subjectId,
        unitId,
        chapterId,
        topicId,
        subTopicId,
        definitionId,
        search,
        tag,
        dateFrom,
        dateTo,
        sort,
      });
      return NextResponse.json(result);
    }

    const query = {};

    // Hierarchy filters (sparse logic - if provided, match it)
    if (examId) query.examId = examId;
    if (subjectId) query.subjectId = subjectId;
    if (unitId) query.unitId = unitId;
    if (chapterId) query.chapterId = chapterId;
    if (topicId) query.topicId = topicId;
    if (subTopicId) query.subTopicId = subTopicId;
    if (definitionId) query.definitionId = definitionId;

    if (!isAdmin) {
      // For students/guests, show ONLY approved content
      query.isApproved = true;
    } else if (status === "pending") {
      query.isApproved = false;
    } else if (status === "approved") {
      query.isApproved = true;
    } else if (status === "reply_pending") {
      // Threads that have at least one reply pending approval
      const threadIdsWithPendingReplies = await Reply.distinct("threadId", {
        isApproved: false,
      });
      query._id = { $in: threadIdsWithPendingReplies };
      if (threadIdsWithPendingReplies.length === 0) {
        // No threads have pending replies; return empty result
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: 1,
            limit: parseInt(searchParams.get("limit") || "10", 10),
            pages: 0,
          },
        });
      }
    } // if status='all' or not provided for admin, show all

    // Text Search — title only (not content)
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    // Tag Filter
    if (tag && tag !== "All Topics" && tag !== "All") {
      query.tags = tag;
    }

    // Date range filter (createdAt)
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom + "T00:00:00.000Z");
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo + "T23:59:59.999Z");
      }
    }

    // Sorting (getSortOption: "new" => newest first at top; hot/views/date_* for admin)
    const sortOption = getSortOption(sort);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const threads = await Thread.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate("author", "firstName lastName avatar email role")
      .populate("examId", "name slug")
      .populate("subjectId", "name slug")
      .populate("unitId", "name slug")
      .populate("chapterId", "name slug")
      .populate("topicId", "name slug")
      .populate("subTopicId", "name slug")
      .lean();

    const total = await Thread.countDocuments(query);

    // For admin: attach total reply count and pending reply count per thread
    if (isAdmin && threads.length > 0) {
      const threadIds = threads.map((t) => t._id);
      const counts = await Reply.aggregate([
        { $match: { threadId: { $in: threadIds } } },
        {
          $group: {
            _id: "$threadId",
            totalReplies: { $sum: 1 },
            pendingReplies: {
              $sum: { $cond: [{ $eq: ["$isApproved", false] }, 1, 0] },
            },
          },
        },
      ]);
      const countMap = Object.fromEntries(
        counts.map((c) => [
          c._id.toString(),
          { totalReplies: c.totalReplies, pendingReplies: c.pendingReplies },
        ]),
      );
      threads.forEach((t) => {
        const c = countMap[t._id.toString()];
        t.totalReplies = c ? c.totalReplies : t.replyCount || 0;
        t.pendingReplies = c ? c.pendingReplies : 0;
      });
    }

    return NextResponse.json({
      success: true,
      data: threads,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching threads:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch threads" },
      { status: 500 },
    );
  }
}

// POST: Create new thread
export async function POST(request) {
  try {
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDB();
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.content) {
      return NextResponse.json(
        { success: false, message: "Title and content are required" },
        { status: 400 },
      );
    }

    // Generate slug (unique per hierarchy) so validation passes; model pre-save also sets it but validation runs first
    let slug = slugify(body.title, { lower: true, strict: true }) || "thread";
    const hierarchyFilter = {
      examId: body.examId || null,
      subjectId: body.subjectId || null,
      unitId: body.unitId || null,
      chapterId: body.chapterId || null,
      topicId: body.topicId || null,
      subTopicId: body.subTopicId || null,
      definitionId: body.definitionId || null,
    };
    const slugRegEx = new RegExp(
      `^${slug.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}(-[0-9]*)?$`,
      "i",
    );
    const existing = await Thread.find({
      ...hierarchyFilter,
      slug: slugRegEx,
    }).lean();
    if (existing.length > 0) slug = `${slug}-${existing.length + 1}`;

    const newThread = await Thread.create({
      ...body,
      slug,
      author: user.type === "Guest" ? null : user.id,
      authorType: user.type,
      guestName: user.type === "Guest" ? user.name : undefined,
      contributorDisplayName: user.type === "User" ? "Testprepkart" : undefined, // Admin-created threads show as Testprepkart on frontend
      tags: body.tags || ["General"],
      isApproved: user.type === "User", // Only Admin/User posts are auto-approved, Students and Guests need approval
    });

    // Confirmation email to author (Student/User only)
    if (user.type !== "Guest") {
      getAuthorEmail(newThread.author, newThread.authorType).then((email) => {
        if (!email) return;
        getEmailTemplateContent("thread_created", {
          thread_title: newThread.title,
          is_approved: newThread.isApproved,
          is_pending: newThread.isApproved ? "now live" : "pending moderation",
        }).then(({ subject, text, html }) =>
          sendMail({ to: email, subject, text, html }).catch((err) =>
            console.error("Thread created email error:", err)
          )
        );
      });
    }

    return NextResponse.json({
      success: true,
      data: newThread,
      message: "Thread created successfully",
    });
  } catch (error) {
    console.error("Error creating thread:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create thread" },
      { status: 500 },
    );
  }
}
